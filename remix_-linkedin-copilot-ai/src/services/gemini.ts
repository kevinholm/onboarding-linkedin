import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "DIN_GEMINI_API_NØGLE_HER" || apiKey === "") {
      throw new Error("MANGLER_API_NØGLE");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export type LinkedInTone = 'professional' | 'casual' | 'insightful' | 'witty' | 'supportive' | 'challenging';
// ... rest of types ...
export type LinkedInTwist = 'none' | 'humor' | 'self-insight' | 'irony' | 'self-irony' | 'provocation';

export type ExecutiveLevel = 'PE/VC/FO' | 'Board' | 'CEO' | 'C-level' | 'VP/SVP/Director' | 'Head of';

export interface ExecutiveContext {
  levels: ExecutiveLevel[];
  titles: Record<string, string[]>;
  industries: string[];
  subIndustries: string[];
  specialties: string[];
  niches: string[];
  keywords: string[];
  targetAudience: string[];
  cvText?: string;
  linkedInUrl?: string;
  name?: string;
  headline?: string;
  profileImageUrl?: string;
  preferredCountry?: string;
  preferredLanguage?: string;
}

export interface Expertise {
  id: string;
  name: string;
  description: string;
}

export interface CommentResponse {
  comment: string;
  reasoning: string;
}

export type LinkedInPostType = 'standard' | 'poll' | 'carousel';

export async function generateLinkedInPost(
  topic: string, 
  tone: LinkedInTone, 
  mode: 'scratch' | 'rewrite' = 'scratch',
  context?: ExecutiveContext,
  language: string = 'Danish',
  highlights?: {
    industries?: string[];
    subIndustries?: string[];
    specialties?: string[];
    niches?: string[];
    keywords?: string[];
  },
  config?: {
    type?: LinkedInPostType;
    useEmojisInText?: boolean;
    useEmojisInBullets?: boolean;
    includeHashtags?: boolean;
  }
) {
  const titles = context ? Object.values(context.titles).flat().join(', ') : '';
  
  try {
    const ai = getAI();
    let highlightStr = "";
    if (highlights) {
      const parts = [];
      if (highlights.industries?.length) parts.push(`Brancher: ${highlights.industries.join(', ')}`);
      if (highlights.subIndustries?.length) parts.push(`Underbrancher: ${highlights.subIndustries.join(', ')}`);
      if (highlights.specialties?.length) parts.push(`Specialer: ${highlights.specialties.join(', ')}`);
      if (highlights.niches?.length) parts.push(`Nicher: ${highlights.niches.join(', ')}`);
      if (highlights.keywords?.length) parts.push(`Søgeord: ${highlights.keywords.join(', ')}`);
      if (parts.length) highlightStr = `\n\nFREMHÆV SÆRLIGT DISSE ELEMENTER I OPSLAGET:\n${parts.join('\n')}`;
    }

    const emojiConfig = config?.useEmojisInText ? "- Brug 1-3 relevante smileys i teksten for at give personlighed." : "- Brug INGEN smileys i brødteksten.";
    const bulletConfig = config?.useEmojisInBullets ? "- Brug relevante emojis som bullet points." : "- Brug klassiske bullet points (• eller -).";
    const hashtagConfig = config?.includeHashtags ? "- Tilføj 2-4 relevante hashtags til sidst." : "- Brug ingen hashtags.";
    const typeConfig = config?.type === 'poll' 
      ? "Dette skal være en LinkedIn POLL. Inkluder et spørgsmål og 2-4 svarmuligheder." 
      : config?.type === 'carousel' 
      ? "Dette skal være en LinkedIn KARRUSEL. Opdel indholdet i slides (Slide 1, Slide 2 osv.)." 
      : "Dette skal være et standard LinkedIn opslag.";

    const contextStr = context ? `\nDIN PROFIL: ${context.levels.join(' & ')} (${titles}) inden for brancherne ${context.industries.join(', ')}. Nicher: ${context.niches.join(', ')}. Specialer: ${context.specialties.join(', ')}. Målgruppe: ${context.targetAudience.join(', ')}.` : "";
    
    const prompt = mode === 'scratch' 
      ? `Du er en Executive LinkedIn Ghostwriter for en ${context?.levels.join(' & ') || 'C-Level leder'}. Skriv et autoritært, visionært og engagerende LinkedIn-opslag om: "${topic}". ${contextStr}${highlightStr}
         
         FORMAT & STIL:
         - Type: ${typeConfig}
         - Tonen skal være ${tone}. 
         - Sproget skal være ${language}.
         ${emojiConfig}
         ${bulletConfig}
         ${hashtagConfig}
         - Brug en 'Executive Hook' (direkte, vægtig, provokerende).
         - 3-5 korte afsnit med masser af hvid plads.
         - Slut med en strategisk 'Call to Action' der inviterer til dialog på højt niveau.`
      : `Du er en Executive LinkedIn Ghostwriter. Her er et eksisterende opslag: "${topic}". ${contextStr}${highlightStr}
         
         Omskriv det så det udstråler ${context?.levels.join(' & ') || 'Executive'} autoritet. 
         Optimer 'hook', struktur og sprogbrug til at ramme beslutningstagere. 
         - Type: ${typeConfig}
         - Tonen skal være ${tone}. 
         - Sproget skal være ${language}.
         ${emojiConfig}
         ${bulletConfig}
         ${hashtagConfig}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Post Generation Error:", error);
    throw error;
  }
}

export interface ProfileAnalysis {
  score: number;
  critique: {
    headline: string;
    about: string;
    experience: string;
  };
  recommendations: string[];
}

export async function analyzeLinkedInProfile(profileData: string, context?: ExecutiveContext): Promise<ProfileAnalysis> {
  const titles = context ? Object.values(context.titles).flat().join(', ') : '';
  const contextStr = context ? `Målet er at positionere sig som ${context.levels.join(' & ')} (${titles}) i brancherne ${context.industries.join(', ')} med fokus på ${context.niches.join(', ')}.` : "";
  
  const prompt = `Du er en LinkedIn profil-ekspert for Executives. Analyser følgende profil-data baseret på 360Brew strategien. ${contextStr}
  
  PROFIL DATA:
  "${profileData}"
  
  Giv en score fra 0-100 baseret på "Executive Authority" og "Thought Leadership potentiale".
  Analyser Headline, About-sektion og Experience specifikt i forhold til om det rammer beslutningstagere.
  Giv 3-5 konkrete, strategiske anbefalinger.`;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            critique: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                about: { type: Type.STRING },
                experience: { type: Type.STRING },
              },
              required: ["headline", "about", "experience"],
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["score", "critique", "recommendations"],
        },
      },
    });

    return JSON.parse(response.text || "{}") as ProfileAnalysis;
  } catch (error) {
    console.error("Profile Analysis Error:", error);
    throw error;
  }
}

export async function suggestCompetencies(context: ExecutiveContext): Promise<string[]> {
  const prompt = `Som en Executive Coach, foreslå 5-7 relevante faglige kompetencer/nicher for en leder i brancherne "${context.industries.join(', ')}" med fokus på "${context.niches.join(', ')}" og specialerne "${context.specialties.join(', ')}". 
  Disse skal bruges som "triggers" til LinkedIn indhold. Returner kun en JSON liste af strenge.`;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Competency Suggestion Error:", error);
    return [];
  }
}
export async function generateLinkedInComment(
  postText: string, 
  tone: LinkedInTone, 
  expertises?: Expertise[],
  twist: LinkedInTwist = 'none',
  context?: ExecutiveContext,
  refinement?: string,
  previousComment?: string,
  language: string = 'Danish'
): Promise<CommentResponse> {
  const model = "gemini-3-flash-preview";
  const truncatedPost = postText.length > 5000 ? postText.substring(0, 5000) + "..." : postText;
  const titles = context ? Object.values(context.titles).flat().join(', ') : '';
  const contextStr = context ? `Du skriver som en ${context.levels.join(' & ')} (${titles}) i brancherne ${context.industries.join(', ')} med fokus på ${context.niches.join(', ')}.` : "Du skriver som en Executive.";

  let prompt = `Du er en LinkedIn Thought Leader og ${context?.levels.join(' & ') || 'Executive'}. Din opgave er at skrive en kommentar, der føles 100% autentisk, visionær og fagligt overlegen. ${contextStr}

STRATEGI & STRUKTUR:
1. EXECUTIVE VOICE: Tal som en der har ansvar og indsigt. Undgå floskler.
2. STRUKTUR: 3-5 korte afsnit. Masser af luft.
3. INDHOLD (360Brew+):
   - Anerkendelse: Ægte validering.
   - Strategisk Indsigt: Inddrag din ekspertise og sæt det i et større forretningsmæssigt perspektiv.
   - Personligt Twist: Bryd facaden med ${twist !== 'none' ? twist : 'et menneskeligt element'}.
   - High-Level Dialog: Afslut med et spørgsmål der udfordrer præmissen på et strategisk niveau.

KONTEKST:
OPSLAG: "${truncatedPost}"
TONE: ${tone}
SPROG: ${language}`;

  if (expertises && expertises.length > 0) {
    const expertiseContext = expertises.map(e => `"${e.name}" (${e.description})`).join(", ");
    prompt += `\n\nDIN FAGLIGE PROFIL: Kombiner din ekspertise inden for: ${expertiseContext}.`;
  }

  if (previousComment && refinement) {
    prompt += `\n\nREFINEMENT: Tidligere kommentar: "${previousComment}". Brugerens ønske: "${refinement}". Gør den endnu mere autoritær og personlig.`;
  }

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            comment: {
              type: Type.STRING,
              description: "LinkedIn-kommentaren (Executive tone, 3-5 afsnit).",
            },
            reasoning: {
              type: Type.STRING,
              description: "Hvorfor denne kommentar positionerer brugeren som en autoritet på C-Level.",
            },
          },
          required: ["comment", "reasoning"],
        },
      },
    });

    return JSON.parse(response.text || "{}") as CommentResponse;
  } catch (error) {
    console.error("Gemini Comment Generation Error:", error);
    return {
      comment: "Beklager, der skete en fejl under genereringen. Prøv igen om et øjeblik.",
      reasoning: "Fejl: " + (error instanceof Error ? error.message : "Ukendt fejl"),
    };
  }
}

export interface OptimizedProfile {
  headline: string;
  about: string;
  experience: {
    title: string;
    description: string;
    skills: string[];
  }[];
  skills: string[];
  certifications: string[];
}

export async function suggestTargetAudiences(description: string, context?: ExecutiveContext): Promise<string[]> {
  const contextStr = context ? `Brugeren er ${context.levels.join(' & ')} inden for ${context.industries.join(', ')}.` : "";
  
  const prompt = `Du er en LinkedIn Strategi Ekspert. Baseret på denne beskrivelse af en ønsket målgruppe: "${description}", foreslå 5-8 relevante, specifikke målgrupper eller segmenter til LinkedIn. ${contextStr}
  
  Brug professionelle betegnelser (f.eks. "C-Level hos SMV", "PE/VC Partnere", "Headhuntere", "Beslutningstagere i Enterprise").
  Returner kun en JSON liste af strenge.`;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Target Audience Suggestion Error:", error);
    return [];
  }
}

export async function optimizeLinkedInProfile(context: ExecutiveContext): Promise<OptimizedProfile> {
  const prompt = `Som ekspert i Executive Search og LinkedIn-profiloptimering på C-level, analyser dette CV og den professionelle kontekst for at skabe en 360Brew optimeret LinkedIn-profil.

CV: ${context.cvText || 'Ikke angivet'}
Branche/Domæne: ${context.industries.join(', ')}
Underbrancher: ${context.subIndustries.join(', ')}
Specialer: ${context.specialties.join(', ')}
Nicher: ${context.niches.join(', ')}
Boolean Keywords: ${context.keywords.join(', ')}
Målgruppe: ${context.targetAudience.join(', ')}

Generer følgende i JSON format:
- headline: (Max 220 tegn) En kraftfuld headline der kombinerer titler, domæne og værdiskabelse.
- about: (Max 2600 tegn) En engagerende "Om" tekst i første person, der fremhæver resultater, ekspertise og personlighed. Inkluder en sektion med "Core Competencies".
- experience: En liste over de 3 vigtigste erfaringsafsnit med:
    - title: Optimeret titel
    - description: (Max 2000 tegn) Resultatorienteret beskrivelse med konkrete tal/KPI'er.
    - skills: 3-5 specifikke kompetencer der skal fremhæves under dette afsnit.
- skills: En prioriteret liste over de 10 vigtigste søgbare kompetencer til LinkedIn Skills sektionen.
- certifications: Forslag til relevante certificeringer eller kurser der vil styrke profilen yderligere.

Sørg for at teksterne er professionelle, selvsikre og optimeret til LinkedIn's algoritme (SEO).
Svar kun med JSON.`;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            about: { type: Type.STRING },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  skills: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["title", "description", "skills"]
              }
            },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            certifications: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["headline", "about", "experience", "skills", "certifications"]
        }
      }
    });

    return JSON.parse(response.text || "{}") as OptimizedProfile;
  } catch (error) {
    console.error("Profile Optimization Error:", error);
    throw error;
  }
}

export async function generateBooleanSearch(
  domain: string,
  context: ExecutiveContext,
  country: string = 'Denmark'
): Promise<string> {
  const prompt = `Som Executive Research ekspert, generer en avanceret LinkedIn Boolean Search string for at finde "Thought Leaders" og indflydelsesrige profiler inden for: "${domain}".
  
  KRAV:
  1. Brug operatorer som AND, OR, NOT og parenteser.
  2. Inkluder titler som (CEO OR Founder OR Director OR "Thought Leader" OR Expert).
  3. Målret mod landet: ${country}.
  4. Inkluder nøgleord relateret til domænet.
  5. Stringen skal kunne indsættes direkte i LinkedIns søgefelt.
  
  Svar kun med selve søgestrengen.`;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    return response.text?.trim() || domain;
  } catch (error) {
    console.error("Boolean Search Error:", error);
    return domain;
  }
}

export async function searchThoughtLeaders(
  domain: string, 
  context?: ExecutiveContext,
  country: string = 'Denmark'
): Promise<any[]> {
  const prompt = `Find 5-6 virkelige, indflydelsesrige LinkedIn Thought Leaders eller profiler inden for domænet: "${domain}" i ${country}.
  
  KRAV:
  1. Brug Google Search til at finde RIGTIGE, aktive profiler. Prøv forskellige søgninger som:
     - "site:linkedin.com/in/ [domæne] thought leader ${country}"
     - "top [domæne] influencers linkedin ${country}"
     - "[domæne] expert linkedin ${country}"
  2. For hver profil, find deres navn og headline.
  3. Giv en begrundelse for hvorfor de er relevante.
  4. Identificer 3 nøgleemner de ofte skriver om.
  
  Returner resultatet som en JSON liste af objekter med:
  - name: Fulde navn
  - headline: Præcis LinkedIn headline
  - reason: Strategisk begrundelse (på dansk)
  - topics: Liste af 3 emner
  - lastPostDate: Estimeret dato for seneste aktivitet (YYYY-MM-DD)
  - industry: Branche
  
  VIGTIGT: Svar KUN med JSON. Hvis du ikke finder nogen, returner en tom liste [].`;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "";
    // Robust JSON extraction
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("Failed to parse extracted JSON:", e);
      }
    }
    
    // Fallback to direct parse
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse response text as JSON:", e);
      return [];
    }
  } catch (error) {
    console.error("Search Thought Leaders Error:", error);
    return [];
  }
}

export async function refineLinkedInPost(
  currentPost: string,
  instructions: string,
  context?: ExecutiveContext,
  language: string = 'Danish'
) {
  const prompt = `Du er en Executive LinkedIn Ghostwriter. Din opgave er at forfine og omskrive dette LinkedIn-opslag baseret på brugerens instruktioner.
  
  NUVÆRENDE OPSLAG:
  "${currentPost}"
  
  BRUGERENS INSTRUKTIONER:
  "${instructions}"
  
  KONTEKST:
  ${context ? `Brugeren er ${context.levels.join(' & ')} inden for ${context.industries.join(', ')}.` : ''}
  
  KRAV:
  1. Bevar den professionelle, autoritære tone.
  2. Implementer brugerens ønsker præcist.
  3. Optimer hook og struktur for maksimal engagement.
  4. Sproget skal være ${language}.
  
  Returner kun det færdige, forfinede opslag.`;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    return response.text;
  } catch (error) {
    console.error("Refine Post Error:", error);
    throw error;
  }
}

export async function deepResearchPost(
  currentPost: string,
  context?: ExecutiveContext,
  language: string = 'Danish'
) {
  const prompt = `Du er en Executive Research Assistant. Din opgave er at forbedre dette LinkedIn-opslag ved at tilføje dybdegående research, data, fakta og henvisninger til autoritære undersøgelser (f.eks. fra Gartner, McKinsey, Deloitte, Harvard Business Review eller branche-specifikke kilder).
  
  NUVÆRENDE OPSLAG:
  "${currentPost}"
  
  KONTEKST:
  ${context ? `Brugeren er ${context.levels.join(' & ')} inden for ${context.industries.join(', ')} med fokus på ${context.niches.join(', ')}.` : ''}
  
  DIN OPGAVE:
  1. SØG: Start med at bruge Google Search til at finde de nyeste (2024-2026) statistikker, trends og data relateret til emnet i opslaget. Søg efter rapporter fra anerkendte kilder som McKinsey, Gartner, Deloitte eller branche-specifikke nyheder.
  2. INTEGRER: Indarbejd disse fakta i teksten på en måde, der styrker argumentationen uden at ødelægge flowet.
  3. KILDER: Nævn kilderne (f.eks. "Ifølge en ny rapport fra...") for at øge troværdigheden.
  4. TONE: Bevar den autoritære Executive-stemme.
  5. SPROG: Skriv på ${language}.
  
  VIGTIGT: Hvis du ikke finder specifikke data via søgning, så brug din omfattende interne viden om de nyeste trends i branchen til at gøre opslaget mere indsigtsfuldt og data-drevet.
  
  Returner kun det optimerede opslag.`;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    return response.text;
  } catch (error) {
    console.error("Deep Research Error:", error);
    return currentPost;
  }
}
