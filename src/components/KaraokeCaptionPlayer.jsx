import { useEffect, useMemo, useState } from 'react';
import { getActiveCaption, getApproximateActiveWord, parseSrtCaptions } from '../lib/srtCaptions';

function usePrefersReducedMotion(forced) {
  const [prefersReduced, setPrefersReduced] = useState(Boolean(forced));

  useEffect(() => {
    if (typeof forced === 'boolean') {
      queueMicrotask(() => setPrefersReduced(forced));
      return undefined;
    }
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    queueMicrotask(() => setPrefersReduced(query.matches));
    const onChange = (event) => setPrefersReduced(event.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, [forced]);

  return prefersReduced;
}

export default function KaraokeCaptionPlayer({ audioRef, currentTime = 0, captionsPath, captionsText, reducedMotion }) {
  const [loadedText, setLoadedText] = useState(captionsText || '');
  const [status, setStatus] = useState(captionsText ? 'ready' : 'idle');
  const prefersReducedMotion = usePrefersReducedMotion(reducedMotion);

  useEffect(() => {
    let cancelled = false;

    if (captionsText) {
      queueMicrotask(() => {
        if (cancelled) return;
        setLoadedText(captionsText);
        setStatus('ready');
      });
      return () => { cancelled = true; };
    }

    if (!captionsPath) {
      queueMicrotask(() => {
        if (cancelled) return;
        setLoadedText('');
        setStatus('missing');
      });
      return () => { cancelled = true; };
    }

    queueMicrotask(() => { if (!cancelled) setStatus('loading'); });
    fetch(captionsPath, { credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) throw new Error('Captions not found.');
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
  }, [captionsPath, captionsText]);

  const captions = useMemo(() => parseSrtCaptions(loadedText), [loadedText]);
  const activeCaption = getActiveCaption(captions, currentTime) || captions[0] || null;
  const activeWord = activeCaption ? getApproximateActiveWord(activeCaption, currentTime) : null;
  const hasAudioRef = Boolean(audioRef);
  const transitionClass = prefersReducedMotion ? '' : 'transition-all duration-200 ease-out';

  return (
    <section className="rounded-[1.75rem] border border-brand-gold-200/70 bg-gradient-to-br from-white/95 via-brand-sanctuary/90 to-brand-gold-50/80 p-5 text-center shadow-sm dark:border-brand-gold-900/40 dark:from-slate-950/95 dark:via-brand-midnight dark:to-brand-gold-950/20" aria-label="Guided practice captions">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-brand-gold-700 dark:text-brand-gold-400">
        Karaoke captions
      </p>
      {status === 'loading' ? (
        <p className="text-sm font-semibold text-brand-stone-600 dark:text-slate-300" aria-live="polite">Loading captions…</p>
      ) : status === 'missing' || !captions.length ? (
        <p className="text-sm font-semibold text-brand-stone-600 dark:text-slate-300" aria-live="polite">Captions are not available yet.</p>
      ) : (
        <div>
          <p className="sr-only" aria-live="polite" aria-atomic="true">{activeCaption?.text}</p>
          <div className={`mx-auto max-w-2xl rounded-3xl border border-white/70 bg-white/70 px-4 py-6 shadow-inner dark:border-slate-700/60 dark:bg-slate-900/70 ${hasAudioRef ? '' : 'opacity-90'}`} aria-hidden="true">
            <p className="font-serif text-2xl leading-[1.8] text-brand-stone-800 dark:text-slate-100 md:text-3xl">
              {activeCaption.words.map((word, index) => {
                const isActive = activeWord?.index === index;
                return (
                  <span
                    key={`${activeCaption.id}-${word}-${index}`}
                    className={`mx-1 inline-block rounded-2xl px-1.5 py-0.5 ${transitionClass} ${isActive ? 'bg-brand-gold-200/80 text-brand-stone-950 shadow-[0_0_24px_rgba(217,164,65,0.35)] dark:bg-brand-gold-500/25 dark:text-brand-gold-100 md:scale-110' : 'text-brand-stone-700 dark:text-slate-200'}`}
                  >
                    {word}
                  </span>
                );
              })}
            </p>
          </div>
          <p className="mt-3 text-xs text-brand-stone-500 dark:text-slate-400">
            Word highlighting is estimated from the SRT cue duration.
          </p>
        </div>
      )}
    </section>
  );
}
