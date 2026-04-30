import React, { useState } from 'react';
import { ThumbsUp, MessageSquare, Share2, Send, Globe, MoreHorizontal, Smartphone, Monitor, Heart, Lightbulb, Clapperboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LinkedInPreviewProps {
  text: string;
  authorName: string;
  authorHeadline: string;
  authorAvatar?: string;
  attachments?: { type: 'image' | 'video' | 'pdf'; url: string; name?: string }[];
}

export default function LinkedInPreview({ 
  text, 
  authorName, 
  authorHeadline, 
  authorAvatar = 'https://picsum.photos/seed/executive/100/100',
  attachments = []
}: LinkedInPreviewProps) {
  const [view, setView] = useState<'mobile' | 'desktop'>('desktop');

  const renderAttachments = () => {
    if (attachments.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        {attachments.map((att, idx) => (
          <div key={idx} className="relative rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50">
            {att.type === 'image' && (
              <img src={att.url} alt="Attachment" className="w-full h-auto object-cover" referrerPolicy="no-referrer" />
            )}
            {att.type === 'video' && (
              <div className="aspect-video bg-zinc-900 flex items-center justify-center">
                <Clapperboard className="w-12 h-12 text-white/50" />
                <span className="absolute bottom-4 left-4 text-white text-xs font-bold bg-black/50 px-2 py-1 rounded">Video Preview</span>
              </div>
            )}
            {att.type === 'pdf' && (
              <div className="p-4 flex items-center gap-3 bg-white">
                <div className="w-10 h-12 bg-red-50 rounded flex items-center justify-center border border-red-100">
                  <span className="text-[10px] font-black text-red-600">PDF</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-900 truncate">{att.name || 'Dokument.pdf'}</p>
                  <p className="text-xs text-zinc-500">Klik for at se</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-zinc-100 p-1 rounded-xl w-fit mx-auto">
        <button
          onClick={() => setView('desktop')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
            view === 'desktop' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
          )}
        >
          <Monitor className="w-4 h-4" />
          PC View
        </button>
        <button
          onClick={() => setView('mobile')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
            view === 'mobile' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
          )}
        >
          <Smartphone className="w-4 h-4" />
          Mobil View
        </button>
      </div>

      <div className={cn(
        "mx-auto transition-all duration-500 ease-in-out",
        view === 'mobile' ? "max-w-[375px]" : "max-w-[552px]"
      )}>
        <div className="bg-white border border-zinc-200 shadow-sm rounded-lg overflow-hidden">
          {/* Header */}
          <div className="p-3 flex items-start justify-between">
            <div className="flex gap-2">
              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <h3 className="font-bold text-sm text-zinc-900 truncate">{authorName}</h3>
                  <span className="text-zinc-500 text-xs shrink-0">• 1.</span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-tight line-clamp-2">{authorHeadline}</p>
                <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-0.5">
                  <span>Lige nu</span>
                  <span>•</span>
                  <Globe className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>
            <button className="p-1 hover:bg-zinc-50 rounded-full text-zinc-400">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-3 pb-2">
            <p className="text-sm text-zinc-800 leading-normal whitespace-pre-wrap break-words">
              {text || 'Din tekst vises her...'}
            </p>
            {renderAttachments()}
          </div>

          {/* Stats Bar */}
          <div className="px-3 py-2 flex items-center justify-between border-b border-zinc-100">
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1">
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center border border-white">
                  <ThumbsUp className="w-2 h-2 text-white fill-white" />
                </div>
                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center border border-white">
                  <Heart className="w-2 h-2 text-white fill-white" />
                </div>
                <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center border border-white">
                  <Lightbulb className="w-2 h-2 text-white fill-white" />
                </div>
              </div>
              <span className="text-[10px] text-zinc-500">Du og 12 andre</span>
            </div>
            <div className="text-[10px] text-zinc-500">
              2 kommentarer
            </div>
          </div>

          {/* Actions */}
          <div className="px-1 py-1 flex items-center justify-between">
            <button className="flex-1 py-2 flex flex-col items-center justify-center gap-1 text-zinc-600 hover:bg-zinc-50 rounded transition-colors">
              <ThumbsUp className="w-4 h-4" />
              <span className="text-[10px] font-medium">Synes godt om</span>
            </button>
            <button className="flex-1 py-2 flex flex-col items-center justify-center gap-1 text-zinc-600 hover:bg-zinc-50 rounded transition-colors">
              <MessageSquare className="w-4 h-4" />
              <span className="text-[10px] font-medium">Kommenter</span>
            </button>
            <button className="flex-1 py-2 flex flex-col items-center justify-center gap-1 text-zinc-600 hover:bg-zinc-50 rounded transition-colors">
              <Share2 className="w-4 h-4" />
              <span className="text-[10px] font-medium">Del</span>
            </button>
            <button className="flex-1 py-2 flex flex-col items-center justify-center gap-1 text-zinc-600 hover:bg-zinc-50 rounded transition-colors">
              <Send className="w-4 h-4" />
              <span className="text-[10px] font-medium">Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
