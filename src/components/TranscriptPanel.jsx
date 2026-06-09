import { useEffect, useMemo, useState } from 'react';

function splitTranscript(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export default function TranscriptPanel({ transcriptPath, transcriptText, className = '' }) {
  const [loadedText, setLoadedText] = useState(transcriptText || '');
  const [status, setStatus] = useState(transcriptText ? 'ready' : 'idle');

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

  const paragraphs = useMemo(() => splitTranscript(loadedText), [loadedText]);

  return (
    <section className={`rounded-3xl border border-brand-stone-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/50 ${className}`} aria-labelledby="guided-practice-transcript-heading">
      <h2 id="guided-practice-transcript-heading" className="font-serif text-2xl font-semibold text-brand-stone-900 dark:text-slate-100">
        Read the Guided Practice
      </h2>
      {transcriptPath && (
        <p className="mt-1 text-xs font-semibold text-brand-stone-500 dark:text-slate-400">
          Transcript file: {transcriptPath}
        </p>
      )}
      {status === 'loading' ? (
        <p className="mt-4 text-sm text-brand-stone-600 dark:text-slate-300" aria-live="polite">Loading written transcript…</p>
      ) : status === 'missing' || paragraphs.length === 0 ? (
        <p className="mt-4 text-sm text-brand-stone-600 dark:text-slate-300">The written transcript is not available yet.</p>
      ) : (
        <div className="mt-4 space-y-4 text-sm leading-7 text-brand-stone-700 dark:text-slate-200">
          {paragraphs.map((paragraph, index) => (
            <p key={`${paragraph.slice(0, 24)}-${index}`} className="whitespace-pre-wrap">{paragraph}</p>
          ))}
        </div>
      )}
    </section>
  );
}
