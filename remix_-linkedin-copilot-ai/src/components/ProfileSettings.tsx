import React, { useState } from 'react';
import { Crown, Check, Plus, X, Sparkles, ChevronDown, ChevronUp, Lightbulb, Search, Info, Loader2, Briefcase, AlertCircle, Linkedin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExecutiveContext, ExecutiveLevel, suggestTargetAudiences } from '../services/gemini';
import { GoogleGenAI, Type } from "@google/genai";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TitleGroup = {
  label: string;
  titles: string[];
};

type LevelConfig = {
  type: 'simple' | 'grouped';
  options: string[] | TitleGroup[];
};

const LEVEL_CONFIGS: Record<ExecutiveLevel, LevelConfig> = {
  'PE/VC/FO': {
    type: 'simple',
    options: [
      'Managing Partner', 'General Partner (GP)', 'Limited Partner (LP)', 'Investment Director', 
      'Principal', 'Venture Partner', 'Operating Partner', 'Investment Manager', 
      'Portfolio Manager', 'Family Office Principal', 'Chief Investment Officer (CIO)', 
      'Deal Lead', 'Investment Committee Member', 'Managing Director (PE/VC)', 
      'Fund Manager', 'Head of M&A', 'Private Equity Director', 'Venture Capitalist',
      'Head of Investor Relations', 'Associate (Senior)', 'Associate (Junior)', 'Analyst (Executive)'
    ]
  },
  'Board': {
    type: 'simple',
    options: [
      'Bestyrelsesmedlem', 'Board Member', 'Chairman', 'Bestyrelsesformand', 'Advisory Board Member', 
      'Non-Executive Director', 'Bestyrelsesnæstformand', 'Vice Chairman', 'Professional Board Member', 
      'Bestyrelsesobservatør', 'Board Observer', 'Committee Chair', 'Audit Committee Member'
    ]
  },
  'CEO': {
    type: 'simple',
    options: [
      'CEO', 'MD', 'Managing Director', 'Adm. Direktør', 'Landeansvarlig', 'Landchef', 
      'General Manager', 'Group CEO', 'Koncerndirektør', 'Founding CEO', 'Stiftende Direktør', 
      'Co-CEO', 'Interim CEO', 'Executive Director', 'Direktør', 'Partner & CEO', 
      'Country Manager', 'Regional Director', 'CEO & Founder', 'Administrerende Direktør',
      'President', 'Chief Executive', 'Principal Executive Officer'
    ]
  },
  'C-level': {
    type: 'grouped',
    options: [
      { label: 'CFO', titles: ['CFO', 'Chief Financial Officer', 'Økonomidirektør', 'Finansdirektør', 'Group CFO', 'VP Finance (C-level)', 'Finance Director (C-level)'] },
      { label: 'CCO', titles: ['CCO', 'Chief Commercial Officer', 'Kommerciel Direktør', 'Chief Customer Officer', 'Chief Client Officer', 'Commercial Director (C-level)'] },
      { label: 'COO', titles: ['COO', 'Chief Operations Officer', 'Driftsdirektør', 'Operationsdirektør', 'Chief Operating Officer', 'Operations Director (C-level)'] },
      { label: 'CTO', titles: ['CTO', 'Chief Technology Officer', 'Teknologidirektør', 'Teknisk Direktør', 'Chief Tech Officer', 'VP Engineering (C-level)'] },
      { label: 'CHRO', titles: ['CHRO', 'Chief Human Resources Officer', 'HR Direktør', 'Chief People Officer', 'HR-chef (C-level)', 'VP People & Culture (C-level)'] },
      { label: 'CSO (Sales)', titles: ['CSO', 'Chief Sales Officer', 'Salgsdirektør', 'Chief Revenue Officer', 'CRO', 'VP Sales (C-level)'] },
      { label: 'CMO', titles: ['CMO', 'Chief Marketing Officer', 'Marketingdirektør', 'Markedsføringsdirektør', 'VP Marketing (C-level)'] },
      { label: 'CPO (Product)', titles: ['CPO', 'Chief Product Officer', 'Produktdirektør', 'Head of Product (C-level)', 'VP Product (C-level)'] },
      { label: 'CIO', titles: ['CIO', 'Chief Information Officer', 'IT-direktør', 'Chief Digital Officer', 'CDO', 'VP IT (C-level)'] },
      { label: 'CSO (Strategy)', titles: ['CSO', 'Chief Strategy Officer', 'Strategidirektør', 'Head of Strategy (C-level)'] },
      { label: 'CPO (Procurement)', titles: ['CPO', 'Chief Procurement Officer', 'Indkøbsdirektør', 'Head of Procurement (C-level)'] },
      { label: 'CLO', titles: ['CLO', 'Chief Legal Officer', 'Juridisk Direktør', 'General Counsel'] },
      { label: 'CISO', titles: ['CISO', 'Chief Information Security Officer', 'Sikkerhedsdirektør', 'Head of Security (C-level)'] },
      { label: 'CDO (Data)', titles: ['CDO', 'Chief Data Officer', 'Datadirektør', 'Head of Data (C-level)'] },
      { label: 'CAO', titles: ['CAO', 'Chief Administrative Officer', 'Chief Analytics Officer', 'Administrationsdirektør'] }
    ]
  },
  'VP/SVP/Director': {
    type: 'grouped',
    options: [
      { label: 'Finance', titles: ['VP Finance', 'SVP Finance', 'Finance Director', 'Senior Finance Director', 'Økonomidirektør', 'Finansdirektør'] },
      { label: 'Operations', titles: ['VP Operations', 'SVP Operations', 'Operations Director', 'Driftsdirektør', 'Operationschef'] },
      { label: 'HR / People', titles: ['VP HR', 'SVP HR', 'HR Director', 'People Director', 'VP People & Culture', 'HR-direktør'] },
      { label: 'Engineering', titles: ['VP Engineering', 'SVP Engineering', 'Engineering Director', 'Technical Director', 'Udviklingsdirektør'] },
      { label: 'IT / Tech', titles: ['VP IT', 'SVP IT', 'IT Director', 'Technology Director', 'IT-direktør'] },
      { label: 'Data', titles: ['VP Data', 'SVP Data', 'Data Director', 'Director of Analytics', 'Datadirektør'] },
      { label: 'Product', titles: ['VP Product', 'SVP Product', 'Product Director', 'Senior Product Director', 'Produktdirektør'] },
      { label: 'Sales', titles: ['VP Sales', 'SVP Sales', 'Sales Director', 'Commercial Director', 'Salgsdirektør'] },
      { label: 'Marketing', titles: ['VP Marketing', 'SVP Marketing', 'Marketing Director', 'Brand Director', 'Marketingdirektør'] },
      { label: 'Project', titles: ['Project Director', 'Program Director', 'PMO Director', 'Projektdirektør'] },
      { label: 'Growth', titles: ['VP Growth', 'SVP Growth', 'Growth Director', 'Head of Growth (Director)'] }
    ]
  },
  'Head of': {
    type: 'grouped',
    options: [
      { label: 'Finance', titles: ['Head of Finance', 'Head of Accounting', 'Head of FP&A', 'Økonomichef'] },
      { label: 'Operations', titles: ['Head of Operations', 'Head of Supply Chain', 'Head of Logistics', 'Driftschef'] },
      { label: 'HR / People', titles: ['Head of HR', 'Head of People', 'Head of Talent', 'Head of People & Culture', 'HR-chef'] },
      { label: 'Engineering', titles: ['Head of Engineering', 'Head of Development', 'Head of Software', 'Udviklingschef'] },
      { label: 'IT / Tech', titles: ['Head of IT', 'Head of Infrastructure', 'Head of Technology', 'IT-chef'] },
      { label: 'Data', titles: ['Head of Data', 'Head of Analytics', 'Head of BI', 'Datachef'] },
      { label: 'Product', titles: ['Head of Product', 'Head of Product Management', 'Produktchef'] },
      { label: 'Sales', titles: ['Head of Sales', 'Head of Business Development', 'Salgschef'] },
      { label: 'Marketing', titles: ['Head of Marketing', 'Head of Brand', 'Head of Communications', 'Marketingchef'] },
      { label: 'Project', titles: ['Head of Projects', 'Head of PMO', 'Projektchef'] },
      { label: 'Legal', titles: ['Head of Legal', 'Legal Counsel', 'Chefjurist'] }
    ]
  }
};

const INDUSTRY_CONFIG = [
  {
    name: 'Software & Cloud',
    subs: ['B2B SaaS', 'PaaS', 'IaaS', 'Multi-tenant Architecture', 'Cloud Native', 'Serverless'],
    specialties: ['Product-Led Growth (PLG)', 'Customer Success Strategy', 'Churn Reduction', 'Subscription Economics', 'API Strategy'],
    niches: ['Vertical SaaS', 'Micro-SaaS', 'Enterprise Cloud', 'Hybrid Cloud'],
    keywords: ['AWS', 'Azure', 'GCP', 'Kubernetes', 'Docker', 'Terraform', 'Salesforce', 'HubSpot', 'Zendesk', 'MRR', 'ARR', 'LTV/CAC']
  },
  {
    name: 'Finance',
    subs: ['Fintech', 'Digital Banking', 'Payment Gateways', 'Lending Tech', 'RegTech', 'WealthTech', 'InsurTech'],
    specialties: ['Open Banking (PSD2)', 'Fraud Detection', 'Blockchain Payments', 'Credit Scoring AI', 'Cross-border Settlements'],
    niches: ['Neobanking', 'Buy Now Pay Later (BNPL)', 'Crypto Custody', 'Embedded Finance'],
    keywords: ['Stripe', 'Adyen', 'Swift', 'ISO20022', 'KYC/AML', 'PCI-DSS', 'Ethereum', 'Solidity', 'Smart Contracts']
  },
  {
    name: 'Artificial Intelligence',
    subs: ['Generative AI', 'NLP', 'Computer Vision', 'Predictive Analytics', 'MLOps', 'Edge AI'],
    specialties: ['LLM Implementation', 'Data Governance', 'Ethical AI', 'Neural Networks', 'Autonomous Systems'],
    niches: ['Conversational AI', 'AI Infrastructure', 'Synthetic Data', 'Reinforcement Learning'],
    keywords: ['OpenAI', 'PyTorch', 'TensorFlow', 'HuggingFace', 'LangChain', 'Vector Databases', 'GPU Cluster', 'CUDA']
  },
  {
    name: 'Security',
    subs: ['Cybersecurity', 'Network Security', 'Endpoint Protection', 'IAM', 'Zero Trust', 'SOC Operations', 'Threat Intelligence'],
    specialties: ['Penetration Testing', 'Incident Response', 'Cloud Security Posture', 'Data Privacy', 'GRC'],
    niches: ['DevSecOps', 'Quantum Encryption', 'Managed Security (MSSP)', 'IoT Security'],
    keywords: ['CISSP', 'CISM', 'CEH', 'SIEM', 'EDR', 'XDR', 'SASE', 'CASB', 'NIST Framework', 'ISO 27001']
  },
  {
    name: 'Retail & E-commerce',
    subs: ['Retail Tech', 'Headless Commerce', 'Marketplace Tech', 'Omnichannel', 'Inventory Management', 'Last Mile Tech'],
    specialties: ['Conversion Rate Optimization (CRO)', 'Supply Chain Visibility', 'Personalization Engines', 'Social Commerce'],
    niches: ['D2C Brands', 'B2B Marketplaces', 'Re-commerce', 'Quick Commerce'],
    keywords: ['Shopify Plus', 'Magento', 'BigCommerce', 'Commercetools', 'PIM', 'ERP', 'WMS', 'ROAS', 'GMV']
  },
  {
    name: 'Healthcare',
    subs: ['Healthtech', 'Medtech', 'Telemedicine', 'EHR Systems', 'Remote Monitoring', 'Digital Therapeutics', 'Bioinformatics'],
    specialties: ['Clinical Workflow', 'Healthcare Interoperability', 'Patient Engagement', 'Medical Imaging AI'],
    niches: ['FemTech', 'Mental Health Tech', 'Longevity Tech', 'Precision Medicine'],
    keywords: ['HIPAA', 'GDPR', 'HL7', 'FHIR', 'FDA Class II/III', 'CE Mark', 'DICOM', 'LIMS']
  },
  {
    name: 'Education',
    subs: ['Edtech', 'LMS', 'Adaptive Learning', 'K-12 Tech', 'Higher Ed Tech', 'Corporate Training'],
    specialties: ['Instructional Design', 'Gamification', 'Learning Analytics', 'Skill Mapping'],
    niches: ['Bootcamps', 'Language Learning', 'STEM Education', 'Executive Education'],
    keywords: ['SCORM', 'LTI', 'Canvas', 'Moodle', 'Coursera', 'Udemy', 'Micro-credentials']
  },
  {
    name: 'Real Estate',
    subs: ['Proptech', 'Smart Buildings', 'Property Management Software', 'Real Estate Marketplaces', 'Construction Tech'],
    specialties: ['Asset Optimization', 'Tenant Experience', 'BIM Implementation', 'Real Estate Tokenization'],
    niches: ['Co-working Tech', 'Short-term Rental Tech', 'Sustainable Construction'],
    keywords: ['BIM', 'LEED', 'BREEAM', 'Yardi', 'MRI Software', 'Proptech 3.0']
  },
  {
    name: 'Sustainability',
    subs: ['Greentech', 'Renewable Energy', 'Carbon Accounting', 'Circular Economy Tech', 'Waste Management', 'Water Tech'],
    specialties: ['ESG Reporting', 'Carbon Credits', 'Life Cycle Assessment (LCA)', 'Energy Efficiency'],
    niches: ['Hydrogen Tech', 'Carbon Capture', 'AgTech', 'Ocean Tech'],
    keywords: ['GHG Protocol', 'TcfD', 'SASB', 'GRI', 'Net Zero', 'Circular Design', 'Solar PV']
  },
  {
    name: 'Logistics',
    subs: ['Logistics Tech', 'Freight Tech', 'Warehouse Automation', 'Cold Chain', 'Maritime Tech', 'Autonomous Trucking'],
    specialties: ['Route Optimization', 'Inventory Forecasting', '3PL/4PL Management', 'Last Mile Delivery'],
    niches: ['E-commerce Logistics', 'Cross-border Trade', 'Sustainable Logistics'],
    keywords: ['TMS', 'WMS', 'EDI', 'Blockchain Supply Chain', 'IoT Tracking', 'RFID']
  },
  {
    name: 'Marketing',
    subs: ['Martech', 'Adtech', 'Marketing Automation', 'CDP', 'Programmatic Advertising', 'CRM', 'Content Tech'],
    specialties: ['Attribution Modeling', 'Customer Journey Mapping', 'Data-Driven Marketing', 'SEO/SEM Strategy'],
    niches: ['Influencer Tech', 'Email Marketing', 'Video Marketing Tech'],
    keywords: ['Google Analytics 4', 'Segment', 'Braze', 'Marketo', 'Pardot', 'DSP', 'SSP', 'RTB']
  },
  {
    name: 'HR',
    subs: ['HR Tech', 'ATS', 'HRIS', 'Performance Management', 'Payroll Tech', 'Employee Engagement'],
    specialties: ['Talent Acquisition Strategy', 'Diversity & Inclusion (DEI)', 'People Analytics', 'Remote Work Culture'],
    niches: ['Freelance Marketplaces', 'Skills-based Hiring', 'Wellness Platforms'],
    keywords: ['Workday', 'SuccessFactors', 'BambooHR', 'Greenhouse', 'Lever', 'LMS', 'eNPS']
  },
  {
    name: 'Legal',
    subs: ['Legal Tech', 'Contract Lifecycle Management (CLM)', 'E-discovery', 'Practice Management', 'Compliance Tech'],
    specialties: ['Legal Operations', 'Document Automation', 'IP Management', 'Regulatory Tracking'],
    niches: ['Notary Tech', 'Justice Tech', 'Online Dispute Resolution'],
    keywords: ['Ironclad', 'Clio', 'DocuSign', 'GDPR Compliance', 'Smart Contracts']
  },
  {
    name: 'Manufacturing',
    subs: ['Industry 4.0', 'Industrial IoT', 'Digital Twins', 'Robotics', 'MES', 'Additive Manufacturing'],
    specialties: ['Predictive Maintenance', 'Smart Factory', 'Supply Chain Resilience', 'Process Automation'],
    niches: ['Cobots', '3D Printing', 'Industrial AI'],
    keywords: ['SCADA', 'PLC', 'OEE', 'Six Sigma', 'Lean Manufacturing', 'ISO 9001']
  },
  {
    name: 'Agriculture',
    subs: ['Agtech', 'Foodtech', 'Alternative Proteins', 'Vertical Farming', 'Precision Agriculture', 'Food Waste Tech', 'Farm Management'],
    specialties: ['Sustainable Farming', 'Supply Chain Traceability', 'Nutritional Science', 'Agri-robotics'],
    niches: ['Cultivated Meat', 'Hydroponics', 'Regenerative Ag'],
    keywords: ['GIS', 'Remote Sensing', 'CRISPR', 'Novel Foods', 'FarmLogs']
  },
  {
    name: 'Travel & Hospitality',
    subs: ['Travel Tech', 'Booking Engines', 'Revenue Management', 'Travel Management', 'Experience Platforms'],
    specialties: ['Dynamic Pricing', 'Guest Experience', 'Distribution Strategy', 'Loyalty Programs'],
    niches: ['Business Travel Tech', 'Short-term Rental Tech', 'Sustainable Travel'],
    keywords: ['GDS', 'OTA', 'PMS', 'CRS', 'RevPAR', 'ADR']
  },
  {
    name: 'Mobility',
    subs: ['Electric Vehicles (EV)', 'Autonomous Driving', 'MaaS', 'Charging Infrastructure', 'Connected Car'],
    specialties: ['Battery Tech', 'Fleet Electrification', 'V2G (Vehicle-to-Grid)', 'Shared Mobility'],
    niches: ['Micro-mobility', 'Last Mile Delivery', 'Flying Taxis'],
    keywords: ['ADAS', 'LiDAR', 'CAN bus', 'OTA Updates', 'Battery Management System (BMS)']
  },
  {
    name: 'Aerospace',
    subs: ['Satellite Tech', 'Launch Services', 'Space Data', 'UAV/Drones', 'Avionics'],
    specialties: ['Earth Observation', 'Satellite Communications', 'Aerospace Engineering', 'Defense Tech'],
    niches: ['NewSpace', 'Deep Space Exploration', 'Urban Air Mobility'],
    keywords: ['LEO', 'GEO', 'CubeSat', 'GNSS', 'Remote Sensing']
  },
  {
    name: 'Gaming & Metaverse',
    subs: ['Game Engines', 'Esports', 'VR/AR/XR', 'Web3 Gaming', 'Social Platforms'],
    specialties: ['Game Economy Design', 'Immersive Experiences', 'Community Building', 'Live Ops'],
    niches: ['Cloud Gaming', 'Serious Games', 'Virtual Fashion'],
    keywords: ['Unity', 'Unreal Engine', 'Roblox', 'NFT', 'DAO', 'Metaverse']
  },
  {
    name: 'Media & Streaming',
    subs: ['OTT Platforms', 'Content Delivery Networks (CDN)', 'Audio/Podcast Tech', 'Digital Publishing'],
    specialties: ['Content Personalization', 'Digital Rights Management (DRM)', 'Ad Insertion', 'Audience Analytics'],
    niches: ['Creator Economy', 'Interactive Video', 'Niche Streaming'],
    keywords: ['HLS', 'DASH', 'CDN', 'AVOD', 'SVOD', 'TVOD']
  },
  {
    name: 'Professional Services',
    subs: ['Management Consulting', 'Executive Search', 'Accounting', 'Architecture', 'Design Agencies'],
    specialties: ['Strategy Development', 'Operational Excellence', 'Change Management', 'Digital Transformation'],
    niches: ['Boutique Consulting', 'Interim Management', 'Expert Networks'],
    keywords: ['MBB', 'Big 4', 'Agile', 'Design Thinking', 'KPI', 'OKRs']
  },
  {
    name: 'Investment',
    subs: ['Venture Capital', 'Private Equity', 'Early Stage VC', 'Growth Equity', 'LBO', 'Secondary Markets'],
    specialties: ['Deal Sourcing', 'Due Diligence', 'Portfolio Management', 'Fundraising', 'Exit Strategy'],
    niches: ['Impact Investing', 'Deep Tech VC', 'Family Office'],
    keywords: ['Cap Table', 'Term Sheet', 'IRR', 'TVPI', 'DPI', 'Carry', 'LP/GP']
  },
  {
    name: 'Public Sector',
    subs: ['GovTech', 'Civic Tech', 'Smart Cities', 'Public Health', 'Defense'],
    specialties: ['Public Policy', 'Digital Government', 'Public-Private Partnerships (PPP)', 'Urban Planning'],
    niches: ['E-voting', 'Open Data', 'Digital Identity'],
    keywords: ['G2C', 'G2B', 'Procurement', 'Public Sector Reform']
  },
  {
    name: 'Non-Profit',
    subs: ['NGOs', 'Social Enterprises', 'Philanthropy', 'Foundations', 'Impact Tech'],
    specialties: ['Fundraising', 'Impact Measurement', 'Advocacy', 'Community Engagement'],
    niches: ['Microfinance', 'Global Health', 'Climate Justice'],
    keywords: ['SDGs', 'Theory of Change', 'Social ROI']
  },
  {
    name: 'Biotech',
    subs: ['Drug Discovery', 'Genomics', 'Synthetic Biology', 'Diagnostics', 'Lab Automation'],
    specialties: ['Clinical Trials', 'Regulatory Strategy', 'Bioprocessing', 'Therapeutics'],
    niches: ['Gene Therapy', 'Microbiome', 'Rare Diseases'],
    keywords: ['CRISPR', 'GMP', 'GLP', 'IND', 'NDA', 'CRO']
  }
];

interface ProfileSettingsProps {
  context: ExecutiveContext;
  onSave: (context: ExecutiveContext) => void;
}

export default function ProfileSettings({ context, onSave }: ProfileSettingsProps) {
  const [expandedLevel, setExpandedLevel] = useState<ExecutiveLevel | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [addingCustomFor, setAddingCustomFor] = useState<ExecutiveLevel | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const [expandedIndustries, setExpandedIndustries] = useState<string[]>([]);
  const [showSelectionWarning, setShowSelectionWarning] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState<string | null>(null);
  const [suggestionPrompts, setSuggestionPrompts] = useState<Record<string, string>>({});
  const [aiSuggestionsByIndustry, setAiSuggestionsByIndustry] = useState<Record<string, any>>({});
  const [showBooleanInsight, setShowBooleanInsight] = useState(false);
  const [audienceSearch, setAudienceSearch] = useState('');
  const [audienceSuggestions, setAudienceSuggestions] = useState<string[]>([]);
  const [isSearchingAudience, setIsSearchingAudience] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [personalUrl, setPersonalUrl] = useState(context.linkedInUrl || '');
  const [personalName, setPersonalName] = useState(context.name || '');
  const [personalHeadline, setPersonalHeadline] = useState(context.headline || '');

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const exportFundament = () => {
    let text = "EXECUTIVE FUNDAMENT\n";
    text += "===================\n\n";
    
    text += "POSITIONERING\n";
    text += "-------------\n";
    text += `Niveau: ${context.levels.join(' & ')}\n`;
    text += "Titler:\n";
    Object.entries(context.titles).forEach(([level, titles]) => {
      if (titles.length > 0) {
        text += `  - ${level}: ${titles.join(', ')}\n`;
      }
    });
    text += "\n";

    text += "BRANCHER\n";
    text += "--------\n";
    context.industries.forEach(ind => text += `- ${ind}\n`);
    text += "\n";

    text += "UNDERBRANCHER\n";
    text += "-------------\n";
    context.subIndustries.forEach(sub => text += `- ${sub}\n`);
    text += "\n";

    text += "SPECIALER\n";
    text += "---------\n";
    context.specialties.forEach(spec => text += `- ${spec}\n`);
    text += "\n";

    text += "NICHER\n";
    text += "------\n";
    context.niches.forEach(niche => text += `- ${niche}\n`);
    text += "\n";

    text += "BOOLEAN KEYWORDS\n";
    text += "----------------\n";
    context.keywords.forEach(kw => text += `- ${kw}\n`);
    text += "\n";

    text += "MÅLGRUPPE\n";
    text += "---------\n";
    text += Array.isArray(context.targetAudience) ? context.targetAudience.join(', ') : (context.targetAudience || '');
    text += "\n";

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Executive_Fundament_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const PREDEFINED_AUDIENCES = [
    'Headhuntere og Executive Search',
    'PE/VC/FO',
    'CEOs',
    'C-Level',
    'Startup',
    'Scaleup',
    'SMV',
    'Mid-market',
    'Enterprise',
    'C20'
  ];

  const toggleIndustry = (industryName: string) => {
    const isSelected = context.industries.includes(industryName);
    const config = INDUSTRY_CONFIG.find(i => i.name === industryName);
    
    if (isSelected) {
      // Removing industry - also clean up associated items
      const newIndustries = context.industries.filter(i => i !== industryName);
      const newSubs = context.subIndustries.filter(s => !config?.subs.includes(s));
      const newSpecs = context.specialties.filter(s => !config?.specialties.includes(s));
      const newNiches = context.niches.filter(n => !config?.niches.includes(n));
      const newKws = context.keywords.filter(k => !config?.keywords.includes(k));
      
      onSave({
        ...context,
        industries: newIndustries,
        subIndustries: newSubs,
        specialties: newSpecs,
        niches: newNiches,
        keywords: newKws
      });
      setExpandedIndustries(prev => prev.filter(i => i !== industryName));
    } else {
      // Adding industry
      onSave({
        ...context,
        industries: [...context.industries, industryName]
      });
      setExpandedIndustries(prev => [...prev, industryName]);
    }
  };

  const resetProfile = () => {
    const emptyContext: ExecutiveContext = {
      levels: [],
      titles: {},
      industries: [],
      subIndustries: [],
      specialties: [],
      niches: [],
      keywords: [],
      targetAudience: []
    };
    onSave(emptyContext);
    setExpandedIndustries([]);
    setExpandedLevel(null);
    setActiveGroup(null);
    showFeedback?.("Profil nulstillet");
    setShowResetConfirm(false);
  };

  const toggleLevel = (level: ExecutiveLevel) => {
    const newLevels = context.levels.includes(level)
      ? context.levels.filter(l => l !== level)
      : [...context.levels, level];
    
    const newTitles = { ...context.titles };
    if (!newLevels.includes(level)) {
      delete newTitles[level];
    } else if (!newTitles[level]) {
      newTitles[level] = [];
    }

    onSave({ ...context, levels: newLevels, titles: newTitles });
  };

  const toggleTitle = (level: ExecutiveLevel, title: string) => {
    const currentTitles = context.titles[level] || [];
    const newTitlesForLevel = currentTitles.includes(title)
      ? currentTitles.filter(t => t !== title)
      : [...currentTitles, title];
    
    onSave({
      ...context,
      titles: {
        ...context.titles,
        [level]: newTitlesForLevel
      }
    });
  };

  const toggleItem = (field: keyof ExecutiveContext, value: string) => {
    const current = (context[field] as string[]) || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    
    onSave({ ...context, [field]: updated });
  };

  const toggleIndustryExpansion = (industry: string) => {
    setExpandedIndustries(prev => 
      prev.includes(industry) 
        ? prev.filter(i => i !== industry) 
        : [...prev, industry]
    );
  };

  const handleAudienceSearch = async () => {
    if (!audienceSearch.trim()) return;
    setIsSearchingAudience(true);
    try {
      const suggestions = await suggestTargetAudiences(audienceSearch, context);
      setAudienceSuggestions(suggestions);
    } catch (error) {
      console.error('Audience search error:', error);
    } finally {
      setIsSearchingAudience(false);
    }
  };

  const getAISuggestions = async (industry: string) => {
    const promptText = suggestionPrompts[industry];
    if (!promptText) return;
    
    setIsSuggesting(industry);
    setAiSuggestionsByIndustry(prev => ({ ...prev, [industry]: null }));
    
    try {
      const model = "gemini-3-flash-preview";
      const prompt = `Som ekspert i Executive Search og rekruttering på C-level, giv mig forslag baseret på denne forespørgsel: "${promptText}".
      Brugeren er i denne branche: ${industry}.
      
      Returner forslag i JSON format med disse kategorier:
      - subIndustries: Relevante underbrancher
      - specialties: Relevante specialer
      - niches: Relevante nicher
      - keywords: Konkrete søgeord til LinkedIn/Boolean (værktøjer, certificeringer, metodikker)
      
      Svar kun med JSON.`;

      const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text);
      setAiSuggestionsByIndustry(prev => ({ ...prev, [industry]: data }));
      setSuggestionPrompts(prev => ({ ...prev, [industry]: '' }));
    } catch (error) {
      console.error('AI Suggestion error:', error);
    } finally {
      setIsSuggesting(null);
    }
  };

  const savePersonalInfo = () => {
    onSave({
      ...context,
      linkedInUrl: personalUrl,
      name: personalName,
      headline: personalHeadline
    });
    showFeedback("Personlige oplysninger gemt!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl font-black tracking-tight text-zinc-900">Executive Profil</h2>
          <div className="relative">
            {showResetConfirm ? (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Er du sikker?</span>
                <button 
                  onClick={resetProfile}
                  className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-[10px] font-bold hover:bg-red-600 transition-all"
                >
                  Ja, nulstil
                </button>
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-1.5 bg-zinc-100 text-zinc-500 rounded-lg text-[10px] font-bold hover:bg-zinc-200 transition-all"
                >
                  Fortryd
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-transparent hover:border-red-100"
              >
                <X className="w-4 h-4" />
                Nulstil Profil
              </button>
            )}
          </div>
        </div>
        <p className="text-zinc-500 text-lg">Definer din professionelle identitet for at skabe et fundament for din Thought Leadership.</p>
      </div>

      {/* Personal Profile Section */}
      <div className="bg-white p-8 rounded-[40px] border border-zinc-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
            <Linkedin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-zinc-900">Din LinkedIn Profil</h3>
            <p className="text-sm text-zinc-500">Gør appen personlig ved at tilføje dine egne oplysninger.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Dit Navn</label>
            <input
              type="text"
              placeholder="F.eks. Anders Andersen"
              className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={personalName}
              onChange={(e) => setPersonalName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Din LinkedIn URL</label>
            <input
              type="text"
              placeholder="https://www.linkedin.com/in/ditnavn"
              className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={personalUrl}
              onChange={(e) => setPersonalUrl(e.target.value)}
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Din Headline</label>
            <input
              type="text"
              placeholder="F.eks. CEO hos TechCorp | Board Member | Thought Leader"
              className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={personalHeadline}
              onChange={(e) => setPersonalHeadline(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={savePersonalInfo}
          className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          Gem Personlige Oplysninger
        </button>
      </div>

      {/* Executive Level Section */}
      <div className="space-y-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-lg shadow-zinc-200">
            <Crown className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-zinc-900">Executive Niveau</h3>
            <p className="text-sm text-zinc-500">Vælg dit nuværende eller ønskede niveau for at tilpasse din profil.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Object.keys(LEVEL_CONFIGS) as ExecutiveLevel[]).map((level) => {
            const isSelected = context.levels.includes(level);
            const isExpanded = expandedLevel === level;
            const config = LEVEL_CONFIGS[level];

            return (
              <div key={level} className="space-y-3">
                <button
                  onClick={() => {
                    toggleLevel(level);
                    setExpandedLevel(isExpanded ? null : level);
                  }}
                  className={cn(
                    "w-full p-6 rounded-[32px] border-2 transition-all text-left flex items-center justify-between group",
                    isSelected 
                      ? "bg-zinc-900 border-zinc-900 text-white shadow-xl scale-[1.02]" 
                      : "bg-white border-zinc-100 text-zinc-600 hover:border-zinc-200 hover:bg-zinc-50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      isSelected ? "bg-white/10" : "bg-zinc-100"
                    )}>
                      {isSelected ? <Check className="w-5 h-5 text-amber-400" /> : <Plus className="w-5 h-5 text-zinc-400" />}
                    </div>
                    <span className="font-bold text-lg">{level}</span>
                  </div>
                  {isSelected && (
                    <div className={cn(
                      "p-2 rounded-lg transition-colors",
                      isExpanded ? "bg-white/10" : "transparent"
                    )}>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  )}
                </button>

                <AnimatePresence>
                  {isSelected && isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 bg-zinc-50 rounded-[32px] border border-zinc-100 space-y-6">
                        {config.type === 'simple' ? (
                          <div className="flex flex-wrap gap-2">
                            {(config.options as string[]).map((title) => (
                              <button
                                key={title}
                                onClick={() => toggleTitle(level, title)}
                                className={cn(
                                  "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                                  context.titles[level]?.includes(title)
                                    ? "bg-zinc-900 border-zinc-900 text-white shadow-lg"
                                    : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                                )}
                              >
                                {title}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {(config.options as TitleGroup[]).map((group) => (
                              <div key={group.label} className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">{group.label}</p>
                                <div className="flex flex-wrap gap-2">
                                  {group.titles.map((title) => (
                                    <button
                                      key={title}
                                      onClick={() => toggleTitle(level, title)}
                                      className={cn(
                                        "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                                        context.titles[level]?.includes(title)
                                          ? "bg-zinc-900 border-zinc-900 text-white shadow-lg"
                                          : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                                      )}
                                    >
                                      {title}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="pt-4 border-t border-zinc-200">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Tilføj brugerdefineret titel..."
                              className="flex-1 p-3 bg-white border border-zinc-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                              value={addingCustomFor === level ? customTitle : ''}
                              onChange={(e) => {
                                setAddingCustomFor(level);
                                setCustomTitle(e.target.value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && customTitle) {
                                  toggleTitle(level, customTitle);
                                  setCustomTitle('');
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                if (customTitle) {
                                  toggleTitle(level, customTitle);
                                  setCustomTitle('');
                                }
                              }}
                              className="p-3 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
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

      {/* Industry / Domain Section */}
      <div className="space-y-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-lg shadow-zinc-200">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-zinc-900">Branche & Domæne</h3>
              <p className="text-sm text-zinc-500">Vælg dine primære domæner og dyk ned i detaljerne.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowBooleanInsight(!showBooleanInsight)}
            className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-zinc-200"
          >
            <Search className="w-3.5 h-3.5" />
            Boolean Insight
          </button>
        </div>

        {showBooleanInsight && (
          <div className="p-8 bg-zinc-900 text-white rounded-[32px] space-y-6 animate-in fade-in zoom-in-95 duration-300 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
                <Info className="w-5 h-5 text-zinc-900" />
              </div>
              <h4 className="font-bold text-lg">Ekspert Indsigt: Boolean Search Strategi</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  En researcher leder efter "beviser" på din erfaring. De bruger ikke bare din titel, men kombinerer den med tekniske termer, værktøjer og certificeringer.
                </p>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 font-bold">Eksempel på søgestreng:</p>
                  <code className="text-xs text-amber-300 break-all">
                    ("CFO" OR "Finance Director") AND ("SaaS" OR "Subscription") AND ("M&A" OR "Exit") AND "NetSuite"
                  </code>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Ved at vælge de rigtige underbrancher og keywords herunder, sikrer du at din profil "lyser op" når disse strenge køres. Vi bruger disse data til at optimere dine indlæg og kommentarer.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Industry Selection Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Vælg dine primære brancher</label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {INDUSTRY_CONFIG.map((ind) => {
              const isSelected = context.industries.includes(ind.name);
              const isExpanded = expandedIndustries.includes(ind.name);

              return (
                <button
                  key={ind.name}
                  onClick={() => {
                    if (!isSelected) {
                      toggleIndustry(ind.name);
                    } else {
                      toggleIndustryExpansion(ind.name);
                    }
                  }}
                  className={cn(
                    "px-4 py-3 rounded-xl text-[11px] font-bold transition-all border text-center flex flex-col items-center justify-center gap-1 min-h-[80px] relative",
                    isSelected 
                      ? "bg-zinc-900 border-zinc-900 text-white shadow-xl scale-[1.02] z-10" 
                      : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-50"
                  )}
                >
                  {ind.name}
                  {isSelected && <Check className="w-3 h-3 text-amber-400" />}
                  {isExpanded && (
                    <motion.div 
                      layoutId="active-indicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-amber-400 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Industries Configuration List */}
        <div className="space-y-6">
          <AnimatePresence>
            {context.industries.map((industryName) => {
              const config = INDUSTRY_CONFIG.find(i => i.name === industryName);
              const isExpanded = expandedIndustries.includes(industryName);
              const suggestions = aiSuggestionsByIndustry[industryName];
              
              if (!config) return null;

              return (
                <motion.div
                  key={industryName}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-[40px] border border-zinc-200 shadow-sm overflow-hidden"
                >
                  {/* Header / Toggle */}
                  <div 
                    onClick={() => toggleIndustryExpansion(industryName)}
                    className="p-6 flex items-center justify-between cursor-pointer hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-zinc-900" />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-zinc-900">{industryName}</h4>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                          {isExpanded ? 'Klik for at lukke' : 'Klik for at udfolde detaljer'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleIndustry(industryName);
                        }}
                        className="p-2 hover:bg-zinc-200 rounded-lg text-zinc-400 hover:text-red-500 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-transform",
                        isExpanded ? "rotate-180 bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-400"
                      )}>
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-zinc-100"
                      >
                        <div className="p-8 space-y-10 bg-zinc-50/30">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Sub Industries */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Underbrancher</label>
                                </div>
                                <button 
                                  onClick={() => {
                                    const custom = prompt('Tilføj egen underbranche:');
                                    if (custom) toggleItem('subIndustries', custom);
                                  }}
                                  className="p-1 hover:bg-zinc-200 rounded text-zinc-400 hover:text-zinc-900 transition-all"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {Array.from(new Set([
                                  ...(config.subs || []),
                                  ...context.subIndustries.filter(s => !INDUSTRY_CONFIG.flatMap(i => i.subs).includes(s))
                                ])).map(sub => (
                                  <button
                                    key={sub}
                                    onClick={() => toggleItem('subIndustries', sub)}
                                    className={cn(
                                      "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                                      context.subIndustries.includes(sub)
                                        ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100"
                                        : "bg-white border-zinc-200 text-zinc-600 hover:border-amber-300"
                                    )}
                                  >
                                    {sub}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Specialties */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Specialer</label>
                                </div>
                                <button 
                                  onClick={() => {
                                    const custom = prompt('Tilføj eget speciale:');
                                    if (custom) toggleItem('specialties', custom);
                                  }}
                                  className="p-1 hover:bg-zinc-200 rounded text-zinc-400 hover:text-zinc-900 transition-all"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {Array.from(new Set([
                                  ...(config.specialties || []),
                                  ...context.specialties.filter(s => !INDUSTRY_CONFIG.flatMap(i => i.specialties).includes(s))
                                ])).map(spec => (
                                  <button
                                    key={spec}
                                    onClick={() => toggleItem('specialties', spec)}
                                    className={cn(
                                      "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                                      context.specialties.includes(spec)
                                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100"
                                        : "bg-white border-zinc-200 text-zinc-600 hover:border-blue-300"
                                    )}
                                  >
                                    {spec}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Niches */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Nicher</label>
                                </div>
                                <button 
                                  onClick={() => {
                                    const custom = prompt('Tilføj egen niche:');
                                    if (custom) toggleItem('niches', custom);
                                  }}
                                  className="p-1 hover:bg-zinc-200 rounded text-zinc-400 hover:text-zinc-900 transition-all"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {Array.from(new Set([
                                  ...(config.niches || []),
                                  ...context.niches.filter(n => !INDUSTRY_CONFIG.flatMap(i => i.niches).includes(n))
                                ])).map(niche => (
                                  <button
                                    key={niche}
                                    onClick={() => toggleItem('niches', niche)}
                                    className={cn(
                                      "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                                      context.niches.includes(niche)
                                        ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100"
                                        : "bg-white border-zinc-200 text-zinc-600 hover:border-emerald-300"
                                    )}
                                  >
                                    {niche}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Keywords */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-violet-500" />
                                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Boolean Keywords</label>
                                </div>
                                <button 
                                  onClick={() => {
                                    const custom = prompt('Tilføj eget søgeord:');
                                    if (custom) toggleItem('keywords', custom);
                                  }}
                                  className="p-1 hover:bg-zinc-200 rounded text-zinc-400 hover:text-zinc-900 transition-all"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {Array.from(new Set([
                                  ...(config.keywords || []),
                                  ...context.keywords.filter(k => !INDUSTRY_CONFIG.flatMap(i => i.keywords).includes(k))
                                ])).map(kw => (
                                  <button
                                    key={kw}
                                    onClick={() => toggleItem('keywords', kw)}
                                    className={cn(
                                      "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                                      context.keywords.includes(kw)
                                        ? "bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-100"
                                        : "bg-white border-zinc-200 text-zinc-600 hover:border-violet-300"
                                    )}
                                  >
                                    {kw}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Industry-Specific AI Generator */}
                          <div className="pt-6 border-t border-zinc-200">
                            <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 shadow-sm">
                              <div className="flex items-center gap-3">
                                <Sparkles className="w-5 h-5 text-amber-500" />
                                <h5 className="text-sm font-bold text-zinc-900">AI Deep Insight Generator ({industryName})</h5>
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={suggestionPrompts[industryName] || ''}
                                  onChange={(e) => setSuggestionPrompts(prev => ({ ...prev, [industryName]: e.target.value }))}
                                  placeholder="F.eks. 'Specifikke værktøjer til SaaS vækst' eller 'Certificeringer inden for Fintech'..."
                                  className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 text-sm outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                                  onKeyDown={(e) => e.key === 'Enter' && getAISuggestions(industryName)}
                                />
                                <button
                                  onClick={() => getAISuggestions(industryName)}
                                  disabled={isSuggesting === industryName || !suggestionPrompts[industryName]}
                                  className="px-6 py-3 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                  {isSuggesting === industryName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                  Generer
                                </button>
                              </div>

                              {/* AI Suggestions Display */}
                              <AnimatePresence>
                                {suggestions && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4 pt-4 border-t border-zinc-100"
                                  >
                                    <div className="flex items-center justify-between">
                                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">AI Forslag (Klik for at tilføje)</p>
                                      <button 
                                        onClick={() => setAiSuggestionsByIndustry(prev => ({ ...prev, [industryName]: null }))}
                                        className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900"
                                      >
                                        Ryd forslag
                                      </button>
                                    </div>
                                    
                                    <div className="space-y-4">
                                      {Object.entries(suggestions).map(([key, items]: [string, any]) => (
                                        <div key={key} className="space-y-2">
                                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">{key}</p>
                                          <div className="flex flex-wrap gap-2">
                                            {Array.isArray(items) && items.map((item: string) => (
                                              <button
                                                key={item}
                                                onClick={() => toggleItem(key as any, item)}
                                                className={cn(
                                                  "px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                                                  Array.isArray(context[key as keyof ExecutiveContext]) && (context[key as keyof ExecutiveContext] as string[]).includes(item)
                                                    ? "bg-zinc-900 text-white border-zinc-900"
                                                    : key === 'subIndustries' ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                                    : key === 'specialties' ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                                    : key === 'niches' ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                                    : "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
                                                )}
                                              >
                                                {item}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Target Audience */}
      <div className="space-y-8 bg-white p-10 rounded-[40px] border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-900">Målgruppe</h3>
            <p className="text-sm text-zinc-500">Hvem vil du påvirke med dine opslag?</p>
          </div>
        </div>

        {/* Predefined Audiences */}
        <div className="space-y-4">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Vælg relevante målgrupper</label>
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_AUDIENCES.map(audience => (
              <button
                key={audience}
                onClick={() => toggleItem('targetAudience', audience)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-xs font-bold transition-all border",
                  Array.isArray(context.targetAudience) && context.targetAudience.includes(audience)
                    ? "bg-zinc-900 border-zinc-900 text-white shadow-lg"
                    : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400"
                )}
              >
                {audience}
              </button>
            ))}
          </div>
        </div>

        {/* AI Audience Search */}
        <div className="space-y-4 pt-6 border-t border-zinc-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">AI Målgruppe Søgning</label>
          </div>
          <div className="flex gap-2">
            <input 
              type="text"
              value={audienceSearch}
              onChange={(e) => setAudienceSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAudienceSearch()}
              className="flex-1 px-5 py-3 rounded-xl border border-zinc-200 text-sm outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
              placeholder="Beskriv din målgruppe (f.eks. 'Beslutningstagere i grøn energi')..."
            />
            <button
              onClick={handleAudienceSearch}
              disabled={isSearchingAudience || !audienceSearch.trim()}
              className="px-6 py-3 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSearchingAudience ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Søg
            </button>
          </div>

          <AnimatePresence>
            {audienceSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-zinc-50 rounded-2xl space-y-4 border border-zinc-100"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">AI Forslag (Klik for at tilføje)</p>
                  <button 
                    onClick={() => setAudienceSuggestions([])}
                    className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900"
                  >
                    Ryd forslag
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {audienceSuggestions.map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => toggleItem('targetAudience', suggestion)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-bold border transition-all",
                        Array.isArray(context.targetAudience) && context.targetAudience.includes(suggestion)
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-900"
                      )}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Selected Audiences (Custom) */}
        {Array.isArray(context.targetAudience) && context.targetAudience.some(a => !PREDEFINED_AUDIENCES.includes(a) && !audienceSuggestions.includes(a)) && (
          <div className="space-y-4 pt-6 border-t border-zinc-100">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Dine valgte målgrupper</label>
            <div className="flex flex-wrap gap-2">
              {context.targetAudience
                .filter(a => !PREDEFINED_AUDIENCES.includes(a) && !audienceSuggestions.includes(a))
                .map(audience => (
                  <button
                    key={audience}
                    onClick={() => toggleItem('targetAudience', audience)}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-zinc-900 text-white border border-zinc-900 flex items-center gap-2"
                  >
                    {audience}
                    <X className="w-3 h-3" />
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Levels & Word Clouds */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Vælg dine niveauer & titler</label>
          <span className="text-[10px] text-zinc-400 font-medium italic">Du kan vælge flere niveauer</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {(Object.keys(LEVEL_CONFIGS) as ExecutiveLevel[]).map((level) => {
            const isSelected = context.levels.includes(level);
            const isExpanded = expandedLevel === level;
            const selectedCount = context.titles[level]?.length || 0;
            const config = LEVEL_CONFIGS[level];

            return (
              <div 
                key={level}
                className={cn(
                  "border rounded-3xl transition-all duration-300 overflow-hidden",
                  isSelected ? "border-zinc-900 bg-white shadow-xl" : "border-zinc-200 bg-zinc-50/50"
                )}
              >
                <div 
                  className="p-6 flex items-center justify-between cursor-pointer"
                  onClick={() => {
                    if (!isSelected) toggleLevel(level);
                    setExpandedLevel(isExpanded ? null : level);
                    setActiveGroup(null);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLevel(level);
                      }}
                      className={cn(
                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                        isSelected ? "bg-zinc-900 border-zinc-900 text-white" : "border-zinc-300 bg-white"
                      )}
                    >
                      {isSelected && <Check className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900">{level}</h4>
                      {selectedCount > 0 && (
                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-0.5">
                          {selectedCount} titler valgt
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isSelected && (
                      <div className="flex -space-x-1">
                        {context.titles[level]?.slice(0, 3).map((t, i) => (
                          <div key={i} className="px-2 py-0.5 bg-zinc-100 border border-white rounded-full text-[8px] font-bold text-zinc-600">
                            {t.split(' ')[0]}
                          </div>
                        ))}
                        {selectedCount > 3 && (
                          <div className="px-2 py-0.5 bg-zinc-900 border border-white rounded-full text-[8px] font-bold text-white">
                            +{selectedCount - 3}
                          </div>
                        )}
                      </div>
                    )}
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-6 pb-8 pt-2 border-t border-zinc-100 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-6">
                      {config.type === 'simple' ? (
                        <div className="space-y-4">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Vælg de titler du identificerer dig med:</p>
                          <div className="flex flex-wrap gap-2">
                            {Array.from(new Set([...(config.options as string[]), ...(context.titles[level] || [])])).map((title) => {
                              const isTitleSelected = context.titles[level]?.includes(title);
                              return (
                                <button
                                  key={title}
                                  onClick={() => toggleTitle(level, title)}
                                  className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                                    isTitleSelected 
                                      ? "bg-zinc-900 border-zinc-900 text-white shadow-md scale-105" 
                                      : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                                  )}
                                >
                                  {title}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                              {level === 'C-level' ? 'Vælg C-position' : 'Vælg Område'}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(config.options as TitleGroup[]).map((group) => (
                                <button
                                  key={group.label}
                                  onClick={() => setActiveGroup(activeGroup === group.label ? null : group.label)}
                                  className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                                    activeGroup === group.label
                                      ? "bg-zinc-900 border-zinc-900 text-white shadow-md"
                                      : "bg-zinc-100 border-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                  )}
                                >
                                  {group.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {activeGroup && (
                            <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-200">
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Vælg varianter for {activeGroup}:</p>
                              <div className="flex flex-wrap gap-2">
                                {(config.options as TitleGroup[])
                                  .find(g => g.label === activeGroup)
                                  ?.titles.map((title) => {
                                    const isTitleSelected = context.titles[level]?.includes(title);
                                    return (
                                      <button
                                        key={title}
                                        onClick={() => toggleTitle(level, title)}
                                        className={cn(
                                          "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                                          isTitleSelected 
                                            ? "bg-amber-500 border-amber-500 text-white shadow-md scale-105" 
                                            : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                                        )}
                                      >
                                        {title}
                                      </button>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {/* Custom titles for grouped levels */}
                          {context.titles[level]?.some(t => !(config.options as TitleGroup[]).flatMap(g => g.titles).includes(t)) && (
                            <div className="space-y-3">
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Dine egne titler:</p>
                              <div className="flex flex-wrap gap-2">
                                {context.titles[level]
                                  ?.filter(t => !(config.options as TitleGroup[]).flatMap(g => g.titles).includes(t))
                                  .map((title) => (
                                    <button
                                      key={title}
                                      onClick={() => toggleTitle(level, title)}
                                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all border bg-zinc-900 border-zinc-900 text-white shadow-md scale-105"
                                    >
                                      {title}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="pt-2">
                        {addingCustomFor === level ? (
                          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                            <input
                              autoFocus
                              type="text"
                              value={customTitle}
                              onChange={(e) => setCustomTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && customTitle) {
                                  toggleTitle(level, customTitle);
                                  setCustomTitle('');
                                  setAddingCustomFor(null);
                                }
                                if (e.key === 'Escape') {
                                  setAddingCustomFor(null);
                                  setCustomTitle('');
                                }
                              }}
                              placeholder="Indtast titel..."
                              className="px-4 py-2 rounded-xl text-xs font-bold border border-zinc-900 outline-none w-48"
                            />
                            <button 
                              onClick={() => {
                                if (customTitle) toggleTitle(level, customTitle);
                                setCustomTitle('');
                                setAddingCustomFor(null);
                              }}
                              className="p-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => {
                                setAddingCustomFor(null);
                                setCustomTitle('');
                              }}
                              className="p-2 bg-zinc-100 text-zinc-500 rounded-xl hover:bg-zinc-200 transition-all"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setAddingCustomFor(level)}
                            className="px-4 py-2 rounded-xl text-xs font-bold border border-dashed border-zinc-300 text-zinc-400 hover:border-zinc-900 hover:text-zinc-900 transition-all flex items-center gap-2"
                          >
                            <Plus className="w-3 h-3" />
                            Tilføj egen titel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary / Foundation */}
      <div className="bg-zinc-900 rounded-[40px] p-10 text-white space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 blur-[100px] rounded-full -mr-32 -mt-32" />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
            <Crown className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-2xl font-black">Dit Executive Fundament</h3>
            <p className="text-zinc-400 text-sm">Dette er hvad AI'en bruger til at positionere dig.</p>
          </div>
          <button 
            onClick={exportFundament}
            className="ml-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border border-white/10"
          >
            <ChevronDown className="w-4 h-4 rotate-180" />
            Download Fundament (.txt)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Positionering</h4>
            <div className="space-y-4">
              <p className="text-xl font-medium">
                Du er <span className="text-amber-400">{context.levels.join(' & ') || '...'}</span>
              </p>
              <div className="space-y-3">
                {Object.entries(context.titles).map(([level, titles]) => titles.length > 0 && (
                  <div key={level} className="space-y-1">
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{level}</p>
                    <div className="flex flex-wrap gap-2">
                      {titles.map((t, i) => (
                        <span key={i} className="text-[11px] text-zinc-300 bg-white/5 px-3 py-1 rounded-lg border border-white/5">{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Domæne Ekspertise</h4>
            <div className="space-y-6">
              {context.industries.map(indName => {
                const config = INDUSTRY_CONFIG.find(i => i.name === indName);
                const industrySubs = context.subIndustries.filter(s => config?.subs.includes(s));
                const industrySpecs = context.specialties.filter(s => config?.specialties.includes(s));
                const industryNiches = context.niches.filter(n => config?.niches.includes(n));
                const industryKws = context.keywords.filter(k => config?.keywords.includes(k));

                return (
                  <div key={indName} className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <p className="text-sm font-black text-amber-400 uppercase tracking-tight">{indName}</p>
                    </div>
                    
                    <div className="space-y-2">
                      {industrySubs.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {industrySubs.map((s, i) => (
                            <span key={i} className="text-[9px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">{s}</span>
                          ))}
                        </div>
                      )}
                      {industrySpecs.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {industrySpecs.map((s, i) => (
                            <span key={i} className="text-[9px] text-amber-400/60 bg-white/5 px-2 py-0.5 rounded border border-amber-400/10">{s}</span>
                          ))}
                        </div>
                      )}
                      {industryNiches.length > 0 && (
                        <p className="text-[10px] text-zinc-500 italic">
                          Niche: {industryNiches.join(', ')}
                        </p>
                      )}
                      {industryKws.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {industryKws.map((k, i) => (
                            <span key={i} className="text-[8px] text-violet-400 bg-violet-400/5 border border-violet-400/20 px-2 py-0.5 rounded uppercase font-bold tracking-tighter">{k}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Custom items not tied to a specific industry */}
              {(context.subIndustries.some(s => !INDUSTRY_CONFIG.flatMap(i => i.subs).includes(s)) ||
                context.specialties.some(s => !INDUSTRY_CONFIG.flatMap(i => i.specialties).includes(s)) ||
                context.niches.some(n => !INDUSTRY_CONFIG.flatMap(i => i.niches).includes(n)) ||
                context.keywords.some(k => !INDUSTRY_CONFIG.flatMap(i => i.keywords).includes(k))) && (
                <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Egne Definitioner</p>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {context.subIndustries.filter(s => !INDUSTRY_CONFIG.flatMap(i => i.subs).includes(s)).map((s, i) => (
                        <span key={i} className="text-[9px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">{s}</span>
                      ))}
                      {context.specialties.filter(s => !INDUSTRY_CONFIG.flatMap(i => i.specialties).includes(s)).map((s, i) => (
                        <span key={i} className="text-[9px] text-amber-400/40 bg-white/5 px-2 py-0.5 rounded border border-amber-400/5">{s}</span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {context.niches.filter(n => !INDUSTRY_CONFIG.flatMap(i => i.niches).includes(n)).map((n, i) => (
                        <span key={i} className="text-[9px] text-emerald-400/40 bg-white/5 px-2 py-0.5 rounded border border-emerald-400/5">{n}</span>
                      ))}
                      {context.keywords.filter(k => !INDUSTRY_CONFIG.flatMap(i => i.keywords).includes(k)).map((k, i) => (
                        <span key={i} className="text-[8px] text-violet-400/40 bg-white/5 px-2 py-0.5 rounded border border-violet-400/5 uppercase font-bold tracking-tighter">{k}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-white/10">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Målgruppe</p>
                <p className="text-xs text-zinc-400">
                  {Array.isArray(context.targetAudience) ? context.targetAudience.join(', ') : context.targetAudience || 'Ingen valgt'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
