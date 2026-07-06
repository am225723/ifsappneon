import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mapPath = path.join(root, 'src/lib/guidedPracticeMediaMap.js');
const audioPlayerPath = path.join(root, 'src/components/AudioPracticePlayer.jsx');
const guidedMeditationPath = path.join(root, 'src/pages/GuidedMeditation.jsx');
const karaokePlayerPath = path.join(root, 'src/components/KaraokeCaptionPlayer.jsx');
function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, text) { fs.writeFileSync(file, text); console.log(`Updated ${path.relative(root, file)}`); }
if (!fs.existsSync(mapPath)) throw new Error('Run this from the ifsappneon repo root. Missing src/lib/guidedPracticeMediaMap.js');

let map = read(mapPath);
map = map.replace(/captionsPath: '\/docs\/captions\/([^']+)\.srt'/g, "captionsPath: '/meditations/captions/$1.srt'");
map = map.replace(/transcriptPath: '\/docs\/([^']+\.txt)'/g, (match, oldName, offset, full) => {
  const before = full.slice(Math.max(0, offset - 350), offset);
  const mp3Match = before.match(/mp3Filename: '([^']+)\.mp3'/);
  if (!mp3Match) return match;
  return `transcriptPath: '/meditations/transcripts/${mp3Match[1]}.txt'`;
});
map = map.replace(/(transcriptPath: '\/meditations\/transcripts\/([^']+)\.txt',?)(\n)/g, (match, line, base, newline) => {
  const after = match + map.slice(map.indexOf(match) + match.length, map.indexOf(match) + match.length + 120);
  if (after.includes('karaokePath')) return match;
  return `${line}${newline}    karaokePath: '/meditations/karaoke/${base}.json',${newline}`;
});
write(mapPath, map);

let guided = read(guidedMeditationPath);
guided = guided.replace(/(captionsPath=\{practice\.captionsPath\}\n)/, "$1            karaokePath={practice.karaokePath}\n");
write(guidedMeditationPath, guided);

let audio = read(audioPlayerPath);
audio = audio.replace(
  "export default function AudioPracticePlayer({ audioUrl, captionsPath, title = 'Guided practice', className = '', onEnded, onPlayStateChange, onTimeChange }) {",
  "export default function AudioPracticePlayer({ audioUrl, captionsPath, karaokePath, title = 'Guided practice', className = '', onEnded, onPlayStateChange, onTimeChange }) {"
);
audio = audio.replace(
  "<KaraokeCaptionPlayer audioRef={audioRef} currentTime={currentTime} captionsPath={captionsPath} />",
  "<KaraokeCaptionPlayer audioRef={audioRef} currentTime={currentTime} captionsPath={captionsPath} karaokePath={karaokePath} />"
);
write(audioPlayerPath, audio);

const karaoke = String.raw`import { useEffect, useMemo, useState } from 'react';
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

function normalizeWord(word, fallbackIndex) {
  if (!word) return null;
  const text = String(word.word || word.text || '').trim();
  if (!text) return null;
  return {
    index: fallbackIndex,
    word: text,
    start: Number.isFinite(Number(word.start)) ? Number(word.start) : null,
    end: Number.isFinite(Number(word.end)) ? Number(word.end) : null,
    score: Number.isFinite(Number(word.score)) ? Number(word.score) : null
  };
}

function parseWhisperKaraoke(json) {
  const segments = Array.isArray(json?.segments) ? json.segments : [];
  return segments.map((segment, index) => {
    const words = Array.isArray(segment.words) ? segment.words.map((word, wordIndex) => normalizeWord(word, wordIndex)).filter(Boolean) : [];
    const text = String(segment.text || words.map((word) => word.word).join(' ')).trim();
    return {
      id: index + 1,
      start: Number(segment.start) || 0,
      end: Number(segment.end) || Number(segment.start) || 0,
      text,
      words: words.length ? words : text.split(/\s+/).filter(Boolean).map((word, wordIndex) => ({ index: wordIndex, word, start: null, end: null }))
    };
  }).filter((caption) => caption.text && caption.end >= caption.start);
}

function getActiveWhisperCaption(captions, currentTime) {
  return captions.find((caption) => currentTime >= caption.start && currentTime <= caption.end) || null;
}

function getActiveWhisperWord(caption, currentTime) {
  if (!caption?.words?.length) return null;
  const exactIndex = caption.words.findIndex((word) => Number.isFinite(word.start) && Number.isFinite(word.end) && currentTime >= word.start && currentTime <= word.end);
  if (exactIndex >= 0) return { ...caption.words[exactIndex], index: exactIndex };
  const duration = Math.max(0.1, caption.end - caption.start);
  const progress = Math.min(0.999, Math.max(0, (currentTime - caption.start) / duration));
  const index = Math.min(caption.words.length - 1, Math.max(0, Math.floor(progress * caption.words.length)));
  return { ...caption.words[index], index };
}

export default function KaraokeCaptionPlayer({ audioRef, currentTime = 0, captionsPath, karaokePath, captionsText, reducedMotion }) {
  const [loadedText, setLoadedText] = useState(captionsText || '');
  const [karaokeJson, setKaraokeJson] = useState(null);
  const [status, setStatus] = useState(captionsText ? 'ready' : 'idle');
  const prefersReducedMotion = usePrefersReducedMotion(reducedMotion);

  useEffect(() => {
    let cancelled = false;
    if (!karaokePath) {
      setKaraokeJson(null);
      return () => { cancelled = true; };
    }
    queueMicrotask(() => { if (!cancelled) setStatus('loading'); });
    fetch(karaokePath, { credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) throw new Error('Karaoke timings not found.');
        return response.json();
      })
      .then((json) => {
        if (cancelled) return;
        setKaraokeJson(json);
        setLoadedText('');
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setKaraokeJson(null);
        if (!captionsPath && !captionsText) setStatus('missing');
      });
    return () => { cancelled = true; };
  }, [karaokePath, captionsPath, captionsText]);

  useEffect(() => {
    let cancelled = false;
    if (karaokePath) return () => { cancelled = true; };
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
  }, [captionsPath, captionsText, karaokePath]);

  const whisperCaptions = useMemo(() => parseWhisperKaraoke(karaokeJson), [karaokeJson]);
  const srtCaptions = useMemo(() => parseSrtCaptions(loadedText), [loadedText]);
  const usingWhisper = whisperCaptions.length > 0;
  const captions = usingWhisper ? whisperCaptions : srtCaptions;
  const activeCaption = usingWhisper
    ? getActiveWhisperCaption(captions, currentTime) || captions[0] || null
    : getActiveCaption(captions, currentTime) || captions[0] || null;
  const activeWord = activeCaption
    ? usingWhisper
      ? getActiveWhisperWord(activeCaption, currentTime)
      : getApproximateActiveWord(activeCaption, currentTime)
    : null;
  const hasAudioRef = Boolean(audioRef);
  const transitionClass = prefersReducedMotion ? '' : 'transition-all duration-200 ease-out';

  return (
    <section className="rounded-[1.75rem] border border-brand-gold-200/70 bg-gradient-to-br from-white/95 via-brand-sanctuary/90 to-brand-gold-50/80 p-5 text-center shadow-sm dark:border-brand-gold-900/40 dark:from-slate-950/95 dark:via-brand-midnight dark:to-brand-gold-950/20" aria-label="Guided practice captions">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-brand-gold-700 dark:text-brand-gold-400">Karaoke captions</p>
      {status === 'loading' ? (
        <p className="text-sm font-semibold text-brand-stone-600 dark:text-slate-300" aria-live="polite">Loading captions…</p>
      ) : status === 'missing' || !captions.length ? (
        <p className="text-sm font-semibold text-brand-stone-600 dark:text-slate-300" aria-live="polite">Captions are not available yet.</p>
      ) : (
        <div>
          <p className="sr-only" aria-live="polite" aria-atomic="true">{activeCaption?.text}</p>
          <div className={\`mx-auto max-w-2xl rounded-3xl border border-white/70 bg-white/70 px-4 py-6 shadow-inner dark:border-slate-700/60 dark:bg-slate-900/70 \${hasAudioRef ? '' : 'opacity-90'}\`} aria-hidden="true">
            <p className="font-serif text-2xl leading-[1.8] text-brand-stone-800 dark:text-slate-100 md:text-3xl">
              {activeCaption.words.map((word, index) => {
                const text = typeof word === 'string' ? word : word.word;
                const isActive = activeWord?.index === index;
                return (
                  <span
                    key={\`\${activeCaption.id}-\${text}-\${index}\`}
                    className={\`mx-1 inline-block rounded-2xl px-1.5 py-0.5 \${transitionClass} \${isActive ? 'bg-brand-gold-200/80 text-brand-stone-950 shadow-[0_0_24px_rgba(217,164,65,0.35)] dark:bg-brand-gold-500/25 dark:text-brand-gold-100 md:scale-110' : 'text-brand-stone-700 dark:text-slate-200'}\`}
                  >
                    {text}
                  </span>
                );
              })}
            </p>
          </div>
          <p className="mt-3 text-xs text-brand-stone-500 dark:text-slate-400">
            {usingWhisper ? 'Word highlighting uses Whisper word-level timings.' : 'Word highlighting is estimated from the SRT cue duration.'}
          </p>
        </div>
      )}
    </section>
  );
}
`;
write(karaokePlayerPath, karaoke);
console.log('Meditation karaoke assets are wired. Run npm run build, then commit and deploy.');
