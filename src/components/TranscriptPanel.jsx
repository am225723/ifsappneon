import { useEffect, useId, useMemo, useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { cleanTranscriptText } from '../lib/transcriptCleanup';

function splitTranscript(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export default function TranscriptPanel({ transcriptPath, transcriptText, title = '', className = '', defaultOpen = false }) {
  const [loadedText, setLoadedText] = useState(transcriptText || '');
  const [status, setStatus] = useState(transcriptText ? 'ready' : 'idle');
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  useEffect(() => {
    let cancelled = false;

    if (transcriptText) {
      queueMicrotask(() => {
        if (cancelled) return;
        setLoadedText(transcriptText);
        setStatus('ready');
      });
      return () => { cancelled = true; };
    }

    if (!transcriptPath) {
      queueMicrotask(() => {
        if (cancelled) return;
        setLoadedText('');
        setStatus('missing');
      });
      return () => { cancelled = true; };
    }

    queueMicrotask(() => {
      if (!cancelled) setStatus('loading');
    });
    fetch(transcriptPath, { credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) throw new Error('Transcript not found.');
        return response.text();
      })
      .then((text) => {
        if (cancelled) return;
        setLoadedText(text);
        setStatus(text.trim() ? 'ready' : 'missing');
      })
      .catch(() => {
        if (cancelled) return;
        setLoadedText('');
        setStatus('missing');
      });

    return () => { cancelled = true; };
  }, [transcriptPath, transcriptText]);

  const cleanedText = useMemo(() => cleanTranscriptText(loadedText, title), [loadedText, title]);
  const paragraphs = useMemo(() => splitTranscript(cleanedText), [cleanedText]);

  return (
    <section className={`rounded-[2rem] border border-brand-gold-100 bg-gradient-to-br from-white via-brand-sanctuary/80 to-brand-gold-50/50 p-4 shadow-sm dark:border-brand-gold-900/40 dark:from-slate-950/95 dark:via-brand-midnight dark:to-brand-gold-950/10 md:p-5 ${className}`} aria-labelledby={`${panelId}-heading`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={`${panelId}-content`}
        className="flex w-full items-center justify-between gap-4 rounded-2xl px-2 py-2 text-left focus:outline-none focus:ring-2 focus:ring-brand-gold-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gold-100 text-brand-gold-700 dark:bg-brand-gold-950/40 dark:text-brand-gold-300">
            <BookOpen className="h-5 w-5" />
          </span>
          <span>
            <span id={`${panelId}-heading`} className="block font-serif text-2xl font-semibold text-brand-stone-900 dark:text-slate-100">
              {open ? 'Hide Guided Practice' : 'Read the Guided Practice'}
            </span>
            <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.18em] text-brand-stone-500 dark:text-slate-400">
              Transcript is cleaned and formatted for calm reading
            </span>
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-brand-gold-700 transition-transform dark:text-brand-gold-400 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div id={`${panelId}-content`} hidden={!open} className="mt-4 rounded-[1.5rem] border border-white/70 bg-white/80 p-5 dark:border-slate-700/60 dark:bg-slate-900/70 md:p-7">
        {transcriptPath && (
          <p className="mb-4 text-xs font-semibold text-brand-stone-500 dark:text-slate-400">
            Transcript file: {transcriptPath}
          </p>
        )}
        {status === 'loading' ? (
          <p className="text-sm text-brand-stone-600 dark:text-slate-300" aria-live="polite">Loading written transcript…</p>
        ) : status === 'missing' || paragraphs.length === 0 ? (
          <p className="text-sm text-brand-stone-600 dark:text-slate-300">The written transcript is not available yet.</p>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5 font-serif text-lg leading-8 text-brand-stone-800 dark:text-slate-100">
            {paragraphs.map((paragraph, index) => (
              <p key={`${paragraph.slice(0, 24)}-${index}`} className="whitespace-pre-wrap">{paragraph}</p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
