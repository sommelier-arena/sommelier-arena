import React, { useState, useEffect, useRef } from 'react';

const DOCS_URL: string = (import.meta as any).env?.PUBLIC_DOCS_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? `http://localhost:3002/docs`
    : 'https://sommelier-arena.ducatillon.net/docs');

const NAV_LINKS = [
  { href: '/host', label: 'Host a Tasting' },
  { href: '/play', label: "Join a Tasting" },
  { href: DOCS_URL, label: 'Read the Docs' },
  { href: 'https://github.com/sommelier-arena/sommelier-arena/', label: 'Git Repository' },
];

export function NavBar() {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, []);

  return (
    <nav
      ref={navRef}
      className="w-full bg-white shadow-md px-6 sticky top-0 z-10"
      aria-label="Main navigation"
    >
      <div className="flex items-center" style={{ height: '3.75rem' }}>
        {/* Brand */}
        <a
          href="/"
          className="flex items-center gap-2 font-bold text-base text-slate-800 hover:text-wine-600 transition-colors shrink-0 mr-6"
          aria-label="Sommelier Arena — home"
        >
          🍷 <span className="hidden sm:inline">Sommelier Arena</span>
        </a>

        {/* Desktop nav links (md+) */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="text-base text-slate-600 hover:text-wine-600 transition-colors px-3 py-2"
            >
              {label}
            </a>
          ))}
        </div>

        {/* Hamburger button (< md) */}
        <button
          className="ml-auto md:hidden flex items-center justify-center w-9 h-9 text-slate-600 hover:text-wine-600 transition-colors rounded"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown (< md, only when open) */}
      {open && (
        <div className="md:hidden border-t border-slate-100 py-2 pb-4 flex flex-col">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="text-base text-slate-600 hover:text-wine-600 transition-colors px-2 py-2"
              onClick={() => setOpen(false)}
            >
              {label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
