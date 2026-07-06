import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

// 1) Update guidedPracticeMediaMap paths to point at the new meditation assets.
{
  const path = 'src/lib/guidedPracticeMediaMap.js';
  let text = read(path);

  text = text.replace(
    /(mp3Filename:\s*'([^']+)\.mp3',)([\s\S]*?)(?=\n\s*expectedDuration:)/g,
    (match, mp3Line, baseName, between) => {
      let cleaned = between
        .replace(/\n\s*captionsPath:\s*'[^']+',?/g, '')
        .replace(/\n\s*transcriptPath:\s*'[^']+',?/g, '')
        .replace(/\n\s*karaokePath:\s*'[^']+',?/g, '');

      return `${mp3Line}${cleaned}
    captionsPath: '/meditations/captions/${baseName}.srt',
    transcriptPath: '/meditations/transcripts/${baseName}.txt',
    karaokePath: '/meditations/karaoke/${baseName}.json',`;
    }
  );

  write(path, text);
}

// 2) Pass karaokePath from GuidedMeditation into AudioPracticePlayer.
{
  const path = 'src/pages/GuidedMeditation.jsx';
  let text = read(path);

  if (!text.includes('karaokePath={practice.karaokePath}')) {
    text = text.replace(
      /(\s+captionsPath=\{practice\.captionsPath\})/,
      `$1
             karaokePath={practice.karaokePath}`
    );
  }

  write(path, text);
}

// 3) Update AudioPracticePlayer to accept and forward karaokePath.
{
  const path = 'src/components/AudioPracticePlayer.jsx';
  let text = read(path);

  text = text.replace(
    'export default function AudioPracticePlayer({ audioUrl, captionsPath, title =',
    'export default function AudioPracticePlayer({ audioUrl, captionsPath, karaokePath, title ='
  );

  text = text.replace(
    '<KaraokeCaptionPlayer audioRef={audioRef} currentTime={currentTime} captionsPath={captionsPath} />',
    '<KaraokeCaptionPlayer audioRef={audioRef} currentTime={currentTime} captionsPath={captionsPath} karaokePath={karaokePath} />'
  );

  write(path, text);
}

// 4) Replace KaraokeCaptionPlayer with JSON word-timing support plus SRT fallback.
{
  const path = 'src/components/KaraokeCaptionPlayer.jsx';

  const content = `import { useEffect, useMemo, useState } from 'react';
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

function normalizeWord(word, index) {
  const text = word.word || word.text || String(word).trim();

  return {
    index,
    text,
    start: Number(word.start ?? word.startTime ?? 0),
    end: Number(word.end ?? word.endTime ?? word.start ?? 0)
  };
}

function normalizeKaraokeJson(json) {
  const sourceSegments = Array.isArray(json) ? json : json.segments || json.results || [];

  return sourceSegments
    .map((segment, segmentIndex) => {
      const words = Array.isArray(segment.words)
        ? segment.words.map(normalizeWord).filter((word) => word.text)
        : [];

      const text = segment.text || words.map((word) => word.text).join(' ');

      return {
        id: segment.id || segmentIndex + 1,
        start: Number(segment.start ?? segment.startTime ?? words[0]?.start ?? 0),
        end: Number(segment.end ?? segment.endTime ?? words.at(-1)?.end ?? 0),
        text,
        words
      };
    })
    .filter((segment) => segment.text || segment.words.length);
}

function getActiveKaraokeSegment(segments, currentTime) {
  return segments.find((segment) => currentTime >= segment.start && currentTime <= segment.end) || segments[0] || null;
}

function getActiveKaraokeWord(segment, currentTime) {
  if (!segment?.words?.length) return null;

  return (
    segment.words.find((word) => currentTime >= word.start && currentTime <= word.end) ||
    segment.words.find((word) => currentTime < word.end) ||
    segment.words.at(-1) ||
    null
  );
}

export default function KaraokeCaptionPlayer({
  audioRef,
  currentTime = 0,
  captionsPath,
  karaokePath,
  captionsText,
  reducedMotion
}) {
  const [loadedText, setLoadedText] = useState(captionsText || '');
  const [karaokeData, setKaraokeData] = useState(null);
  const [status, setStatus] = useState(captionsText ? 'ready' : 'idle');
  const prefersReducedMotion = usePrefersReducedMotion(reducedMotion);

  useEffect(() => {
    let cancelled = false;

    async function loadCaptions() {
      if (captionsText) {
        setLoadedText(captionsText);
        setKaraokeData(null);
        setStatus('ready');
        return;
      }

      if (!karaokePath && !captionsPath) {
        setLoadedText('');
        setKaraokeData(null);
        setStatus('missing');
        return;
      }

      setStatus('loading');

      if (karaokePath) {
        try {
          const response = await fetch(karaokePath, { credentials: 'same-origin' });
          if (response.ok) {
            const json = await response.json();
            if (!cancelled) {
              setKaraokeData(normalizeKaraokeJson(json));
              setLoadedText('');
              setStatus('ready');
            }
            return;
          }
        } catch {
          // Fall back to SRT below.
        }
      }

      if (captionsPath) {
        try {
          const response = await fetch(captionsPath, { credentials: 'same-origin' });
          if (!response.ok) throw new Error('Captions not found.');
          const text = await response.text();

          if (!cancelled) {
            setKaraokeData(null);
            setLoadedText(text);
            setStatus(text.trim() ? 'ready' : 'missing');
          }
          return;
        } catch {
          // Missing fallback below.
        }
      }

      if (!cancelled) {
        setKaraokeData(null);
        setLoadedText('');
        setStatus('missing');
      }
    }

    loadCaptions();

    return () => {
      cancelled = true;
    };
  }, [captionsPath, captionsText, karaokePath]);

  const srtCaptions = useMemo(() => parseSrtCaptions(loadedText), [loadedText]);
  const activeKaraokeSegment = karaokeData ? getActiveKaraokeSegment(karaokeData, currentTime) : null;
  const activeKaraokeWord = activeKaraokeSegment ? getActiveKaraokeWord(activeKaraokeSegment, currentTime) : null;
  const activeSrtCaption = !karaokeData ? getActiveCaption(srtCaptions, currentTime) || srtCaptions[0] || null : null;
  const activeSrtWord = activeSrtCaption ? getApproximateActiveWord(activeSrtCaption, currentTime) : null;

  const hasAudioRef = Boolean(audioRef);
  const transitionClass = prefersReducedMotion ? '' : 'transition-all duration-200 ease-out';

  const words = activeKaraokeSegment?.words?.length
    ? activeKaraokeSegment.words
    : activeSrtCaption?.words?.map((word, index) => ({ text: word, index })) || [];

  const activeWordIndex = activeKaraokeWord?.index ?? activeSrtWord?.index ?? -1;
  const activeText = activeKaraokeSegment?.text || activeSrtCaption?.text || '';

  return (
    <section className="rounded-[1.75rem] border border-brand-gold-200/70 bg-gradient-to-br from-white/95 via-brand-sanctuary/90 to-brand-gold-50/80 p-5 text-center shadow-sm dark:border-brand-gold-900/40 dark:from-slate-950/95 dark:via-brand-midnight dark:to-brand-gold-950/20" aria-label="Guided practice captions">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-brand-gold-700 dark:text-brand-gold-400">
        Karaoke captions
      </p>

      {status === 'loading' ? (
        <p className="text-sm font-semibold text-brand-stone-600 dark:text-slate-300" aria-live="polite">Loading captions…</p>
      ) : status === 'missing' || !words.length ? (
        <p className="text-sm font-semibold text-brand-stone-600 dark:text-slate-300" aria-live="polite">Captions are not available yet.</p>
      ) : (
        <div>
          <p className="sr-only" aria-live="polite" aria-atomic="true">{activeText}</p>

          <div className={\`mx-auto max-w-2xl rounded-3xl border border-white/70 bg-white/70 px-4 py-6 shadow-inner dark:border-slate-700/60 dark:bg-slate-900/70 \${hasAudioRef ? '' : 'opacity-90'}\`} aria-hidden="true">
            <p className="font-serif text-2xl leading-[1.8] text-brand-stone-800 dark:text-slate-100 md:text-3xl">
              {words.map((word, index) => {
                const isActive = activeWordIndex === index;

                return (
                  <span
                    key={\`\${activeKaraokeSegment?.id || activeSrtCaption?.id || 'caption'}-\${word.text}-\${index}\`}
                    className={\`mx-1 inline-block rounded-2xl px-1.5 py-0.5 \${transitionClass} \${isActive ? 'bg-brand-gold-200/80 text-brand-stone-950 shadow-[0_0_24px_rgba(217,164,65,0.35)] dark:bg-brand-gold-500/25 dark:text-brand-gold-100 md:scale-110' : 'text-brand-stone-700 dark:text-slate-200'}\`}
                  >
                    {word.text}
                  </span>
                );
              })}
            </p>
          </div>

          <p className="mt-3 text-xs text-brand-stone-500 dark:text-slate-400">
            {karaokeData ? 'Word highlighting uses Whisper timing data.' : 'Word highlighting is estimated from the SRT cue duration.'}
          </p>
        </div>
      )}
    </section>
  );
}
`;

  write(path, content);
}

console.log('Meditation karaoke wiring fixed.');
