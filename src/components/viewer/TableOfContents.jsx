import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

function slugify(text) {
  return text?.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || '';
}

export default function TableOfContents({ blocks = [] }) {
  const [activeId, setActiveId] = useState('');

  const headings = blocks
    .filter(b => b.type === 'heading' && b.content)
    .map(b => ({ id: slugify(b.content), text: b.content, level: b.level || 2 }));

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-10% 0% -80% 0%', threshold: 0 }
    );

    headings.forEach(h => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings.map(h => h.id).join(',')]);

  if (headings.length === 0) return null;

  return (
    <nav className="sticky top-20">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">On this page</p>
      <ul className="space-y-1">
        {headings.map(h => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setActiveId(h.id);
              }}
              className={cn(
                'block text-sm py-0.5 transition-colors border-l-2 hover:text-indigo-600',
                h.level === 2 ? 'pl-3' : h.level === 3 ? 'pl-6' : 'pl-9',
                activeId === h.id
                  ? 'text-indigo-600 border-indigo-500 font-medium'
                  : 'text-slate-500 border-transparent hover:border-slate-300'
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}