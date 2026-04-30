import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Briefcase, Sparkles, Loader2, Check, Lightbulb } from 'lucide-react';
import { Expertise, suggestCompetencies, ExecutiveContext } from '../services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function CompetencyManager() {
  const [competencies, setCompetencies] = useState<Expertise[]>([]);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [context, setContext] = useState<ExecutiveContext | null>(null);

  useEffect(() => {
    const savedContext = localStorage.getItem('executive_context');
    if (savedContext) setContext(JSON.parse(savedContext));

    const saved = localStorage.getItem('linkedin_competencies');
    if (saved) {
      setCompetencies(JSON.parse(saved));
    } else {
      const defaults: Expertise[] = [
        { id: '1', name: 'Kompetenceudvikling', description: 'Fokus på livslang læring og opkvalificering af medarbejdere.' },
        { id: '2', name: 'LinkedIn synlighed', description: 'Strategier til at øge rækkevidde og personlig branding på platformen.' },
        { id: '3', name: 'Corporate Influencing', description: 'Hvordan ledere og nøglepersoner påvirker dagsordenen digitalt.' },
        { id: '4', name: 'Employee Advocacy', description: 'Aktivering af medarbejdere som ambassadører for virksomheden.' },
        { id: '5', name: 'Employer Branding', description: 'Positionering af virksomheden som en attraktiv arbejdsplads.' },
        { id: '6', name: 'Talent Attraction', description: 'Metoder til at tiltrække og fastholde de bedste talenter.' },
        { id: '7', name: 'Thought Leadership', description: 'Etablering af autoritet og tillid gennem dyb faglig indsigt.' }
      ];
      setCompetencies(defaults);
      localStorage.setItem('linkedin_competencies', JSON.stringify(defaults));
    }
  }, []);

  const handleSuggest = async () => {
    if (!context) return;
    setIsSuggesting(true);
    const suggested = await suggestCompetencies(context);
    setSuggestions(suggested);
    setIsSuggesting(false);
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const save = (updated: Expertise[]) => {
    setCompetencies(updated);
    localStorage.setItem('linkedin_competencies', JSON.stringify(updated));
  };

  const add = (name: string, desc: string = '') => {
    if (!name) return;
    const item: Expertise = {
      id: Date.now().toString(),
      name,
      description: desc || `Ekspertise inden for ${name}.`
    };
    save([...competencies, item]);
    setNewName('');
    setNewDesc('');
    setSuggestions(prev => prev.filter(s => s !== name));
  };

  const startEdit = (c: Expertise) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditDesc(c.description);
  };

  const update = () => {
    if (!editingId) return;
    const updated = competencies.map(c => 
      c.id === editingId ? { ...c, name: editName, description: editDesc } : c
    );
    save(updated);
    setEditingId(null);
  };

  const remove = (id: string) => {
    save(competencies.filter(c => c.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <div className="space-y-2">
        <h2 className="text-4xl font-black tracking-tight text-zinc-900">Faglige Triggers</h2>
        <p className="text-zinc-500 text-lg">
          Dine "videns-knapper". AI'en bruger disse til at krydre dine kommentarer og opslag med din unikke faglige vinkel.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[32px] border border-zinc-200 shadow-sm space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Navn på niche / Trigger</label>
                <input
                  type="text"
                  placeholder="F.eks. 'Bæredygtighed' eller 'SaaS Salg'"
                  className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Kort beskrivelse (AI kontekst)</label>
                <textarea
                  placeholder="Hvordan skal AI vinkle din viden? (Valgfri)"
                  className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none transition-all h-24 resize-none"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={() => add(newName, newDesc)}
              disabled={!newName}
              className="flex items-center justify-center gap-2 w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-xl shadow-zinc-200"
            >
              <Plus className="w-5 h-5" />
              Gem som Standard Trigger
            </button>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Dine Gemte Triggers</h3>
              <span className="text-[10px] text-zinc-400 font-medium">{competencies.length} aktive</span>
            </div>
            {competencies.map((c) => (
              <div key={c.id} className="bg-white rounded-3xl border border-zinc-200 group hover:border-zinc-900 transition-all shadow-sm overflow-hidden">
                {editingId === c.id ? (
                  <div className="p-6 space-y-4 bg-zinc-50">
                    <input
                      type="text"
                      className="w-full p-3 rounded-xl border border-zinc-200 text-sm font-bold"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <textarea
                      className="w-full p-3 rounded-xl border border-zinc-200 text-xs h-20 resize-none"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button onClick={update} className="flex-1 py-2 bg-zinc-900 text-white rounded-lg text-xs font-bold">Gem ændringer</button>
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold">Annuller</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => startEdit(c)}>
                      <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-500 group-hover:bg-zinc-900 group-hover:text-white transition-all shrink-0">
                        <Briefcase className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-zinc-900 truncate">{c.name}</h4>
                        <p className="text-xs text-zinc-500 line-clamp-1">{c.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(c)}
                        className="p-2 text-zinc-300 hover:text-zinc-600 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => remove(c.id)}
                        className="p-2 text-zinc-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI Suggestions */}
        <div className="space-y-6">
          <div className="bg-amber-50 rounded-[32px] p-8 border border-amber-100 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-400 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-black text-amber-900">AI Forslag</h3>
            </div>
            
            <p className="text-xs text-amber-800/70 leading-relaxed font-medium">
              Baseret på din profil som <span className="font-bold">{context?.levels.join(' & ')}</span> inden for <span className="font-bold">{context?.industries[0]}</span>.
            </p>

            <button
              onClick={handleSuggest}
              disabled={isSuggesting}
              className="w-full py-3 bg-white text-amber-900 rounded-xl font-bold text-xs border border-amber-200 hover:bg-amber-100 transition-all flex items-center justify-center gap-2"
            >
              {isSuggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
              Få relevante forslag
            </button>

            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => add(s)}
                  className="w-full p-3 bg-white/50 border border-amber-200/50 rounded-xl text-left text-xs font-bold text-amber-900 hover:bg-white hover:border-amber-300 transition-all flex items-center justify-between group"
                >
                  {s}
                  <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 rounded-[32px] p-8 text-white space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Tip</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Vælg triggers der dækker både din **faglige dybde** (f.eks. "SaaS Arkitektur") og dine **strategiske holdninger** (f.eks. "Fremtidens Ledelse").
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
