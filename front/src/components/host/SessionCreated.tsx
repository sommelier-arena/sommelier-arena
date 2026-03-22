import React, { useState } from 'react';

interface SessionCreatedProps {
  code: string;
  hostId: string;
}

const BASE_URL = 'https://sommelier-arena.ducatillon.net';

export function SessionCreated({ code, hostId }: SessionCreatedProps) {
  const shareUrl = `${BASE_URL}/host?id=${encodeURIComponent(hostId)}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
    }
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `Join my wine tasting at Sommelier Arena!\n👉 ${shareUrl}`,
  )}`;

  const iMessageUrl = `sms:?&body=${encodeURIComponent(
    `Join my wine tasting at Sommelier Arena!\n👉 ${shareUrl}`,
  )}`;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 text-center">
      <div>
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Session created!</p>
        <p className="text-slate-600 mt-1 text-sm">
          Share this code with participants:
        </p>
        <p
          className="text-6xl font-mono font-bold text-violet-600 tracking-widest mt-2"
          aria-label={`Session code: ${code.split('').join(' ')}`}
        >
          {code}
        </p>
      </div>

      <div className="border-t border-slate-100 pt-5 space-y-3">
        <p className="text-sm text-slate-600">
          Your host link — save this to return later from any device:
        </p>
        <p className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 break-all">
          {shareUrl}
        </p>
        <p className="text-xs text-slate-500">
          Host ID: <span className="font-mono font-bold text-violet-600">{hostId}</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            onClick={handleCopy}
            className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            {copied ? '✓ Copied!' : '📋 Copy link'}
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-green-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-green-600 transition-colors text-center"
          >
            💬 WhatsApp
          </a>
          <a
            href={iMessageUrl}
            className="flex-1 bg-blue-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-600 transition-colors text-center"
          >
            📱 iMessage
          </a>
        </div>
      </div>
    </div>
  );
}
