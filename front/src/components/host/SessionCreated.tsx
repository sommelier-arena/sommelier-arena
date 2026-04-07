import React, { useState } from 'react';

interface SessionCreatedProps {
  code: string;
  hostId: string;
}

export function SessionCreated({ code, hostId }: SessionCreatedProps) {  const origin = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://sommelier-arena.ducatillon.net';

  // Direct participant link — opening this link auto-joins the session
  const participantUrl = `${origin}/play?code=${encodeURIComponent(code)}`;

  const [copied, setCopied] = useState(false);

  const handleCopyParticipantLink = async () => {
    try {
      await navigator.clipboard.writeText(participantUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
    }
  };

  const shareText = `Join my Sommelier Arena wine tasting! 🍷\n👉 ${participantUrl}`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="w-full max-w-lg mx-auto space-y-8 text-center">
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 text-center">
      <div>
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Tasting created🍷!</p>
        <p className="text-slate-600 mt-1 text-sm">
          Share this code to invite players:
        </p>
        <p
          className="text-6xl font-mono font-bold text-wine-600 tracking-widest mt-2"
          aria-label={`Tasting code: ${code.split('').join(' ')}`}
        >
          {code}
        </p>
      </div>

      <div className="border-t border-slate-100 space-y-3">
        <p className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 break-all">
          {participantUrl}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            onClick={handleCopyParticipantLink}
            className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            {copied ? '✓ Copied!' : '📋 Copy participant link'}
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-green-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-green-600 transition-colors text-center"
          >
            💬 WhatsApp
          </a>
        </div>
      </div>
    </div>
    </div>
  );
}
