import { useEffect, useRef, useState } from 'react';
import { Headphones, Pause, Play, RotateCcw } from 'lucide-react';
import KaraokeCaptionPlayer from './KaraokeCaptionPlayer';

export default function AudioPracticePlayer({ audioUrl, captionsPath, title = 'Guided practice', className = '', onEnded, onPlayStateChange, onTimeChange }) {
  const audioRef = useRef(null);
  const frameRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    onPlayStateChange?.(isPlaying);
  }, [isPlaying, onPlayStateChange]);

  useEffect(() => {
    const tick = () => {
      const time = audioRef.current?.currentTime || 0;
      setCurrentTime(time);
      onTimeChange?.(time);
      if (audioRef.current && !audioRef.current.paused && !audioRef.current.ended) {
        frameRef.current = window.requestAnimationFrame(tick);
      }
    };

    if (isPlaying) frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, [isPlaying, onTimeChange]);

  useEffect(() => {
    queueMicrotask(() => {
      setCurrentTime(0);
      setIsPlaying(false);
      setAudioError(false);
    });
  }, [audioUrl]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || audioError) return;
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => setAudioError(true));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const handleRestart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    onTimeChange?.(0);
  };

  if (!audioUrl) {
    return (
      <div className={`rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-100 ${className}`}>
        Audio is not available for this practice yet. You can still use the written guided practice below.
      </div>
    );
  }

  return (
    <div className={`space-y-4 rounded-[1.75rem] border border-brand-stone-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/50 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-stone-700 dark:text-slate-200">
          <Headphones className="h-4 w-4" /> Audio guidance
          <span className="text-xs font-normal text-brand-stone-500 dark:text-slate-400">{title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleRestart} className="inline-flex items-center gap-1 rounded-xl border border-brand-stone-200 px-3 py-1.5 text-xs font-semibold text-brand-stone-700 hover:bg-brand-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            <RotateCcw className="h-3.5 w-3.5" /> Restart
          </button>
          <button type="button" onClick={handlePlayPause} className="inline-flex items-center gap-1 rounded-xl bg-brand-gold-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-gold-700">
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button type="button" onClick={() => setCaptionsOn((value) => !value)} aria-pressed={captionsOn} className="rounded-xl border border-brand-stone-200 px-3 py-1.5 text-xs font-semibold text-brand-stone-700 hover:bg-brand-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            Captions {captionsOn ? 'on' : 'off'}
          </button>
          <label className="sr-only" htmlFor={`${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-speed`}>Playback speed</label>
          <select
            id={`${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-speed`}
            value={playbackRate}
            onChange={(event) => setPlaybackRate(Number(event.target.value))}
            className="rounded-xl border border-brand-stone-200 bg-white px-2 py-1.5 text-xs font-semibold text-brand-stone-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value={0.75}>0.75x</option>
            <option value={1}>1x</option>
            <option value={1.25}>1.25x</option>
          </select>
        </div>
      </div>

      {audioError && <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-100">Audio could not be loaded. The transcript remains available below.</p>}

      <audio
        ref={audioRef}
        src={audioUrl}
        controls
        className="w-full"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(event) => {
          const time = event.currentTarget.currentTime || 0;
          setCurrentTime(time);
          onTimeChange?.(time);
        }}
        onError={() => setAudioError(true)}
        onEnded={() => {
          setIsPlaying(false);
          onEnded?.();
        }}
      />

      {captionsOn && <KaraokeCaptionPlayer audioRef={audioRef} currentTime={currentTime} captionsPath={captionsPath} />}
    </div>
  );
}
