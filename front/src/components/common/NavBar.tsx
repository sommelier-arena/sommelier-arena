import React from 'react';
import { useCurrentUrl } from '../../hooks/useCurrentUrl';

const DOCS_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? `http://localhost:3002`
    : 'https://sommelier-arena.ducatillon.net/docs';

export function NavBar() {
  const currentUrl = useCurrentUrl();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable
    }
  };

  return (
    <nav
      className="w-full bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3 text-sm sticky top-0 z-10"
      aria-label="Main navigation"
    >
      {/* Logo / Home */}
      <a
        href="/"
        className="flex items-center gap-1.5 font-bold text-violet-600 hover:text-violet-800 transition-colors shrink-0"
        aria-label="Sommelier Arena — home"
      >
        🍷 <span className="hidden sm:inline">Sommelier Arena</span>
      </a>

      {/* Nav links */}
      <div className="flex items-center gap-2 ml-1">
        <a
          href="/"
          className="text-slate-500 hover:text-slate-800 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
        >
          Home
        </a>
        <a
          href="/host"
          className="text-slate-500 hover:text-slate-800 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
        >
          Host
        </a>
        <a
          href="/play"
          className="text-slate-500 hover:text-slate-800 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
        >
          Play
        </a>
        <a
          href={DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-500 hover:text-slate-800 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
        >
          Docs
        </a>
      </div>

      {/* Current URL display — always visible, auto-tracks via useCurrentUrl() */}
      <div className="ml-auto flex items-center gap-2 min-w-0">
        <span
          className="font-mono text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 truncate max-w-[200px] sm:max-w-xs"
          title={currentUrl}
        >
          {currentUrl}
        </span>
        <button
          onClick={handleCopy}
          className="shrink-0 text-xs border border-slate-300 text-slate-600 rounded-lg px-2 py-1 hover:bg-slate-100 transition-colors"
          aria-label="Copy current URL to clipboard"
        >
          {copied ? '✓' : '📋'}
        </button>
      </div>
    </nav>
  );
}
