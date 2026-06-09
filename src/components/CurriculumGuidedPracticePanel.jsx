import { useEffect, useMemo, useState } from 'react';
import { Clock, Headphones } from 'lucide-react';
import TranscriptPanel from './TranscriptPanel';
import { getGuidedPracticeMediaBySection } from '../lib/guidedPracticeMediaMap';
import { loadActiveMeditationMedia, mergeMeditationMediaWithLibrary } from '../lib/meditationMedia';

const fallbackCopy = 'Audio is optional for curriculum guided practices. If the UploadThing URL has not been mapped yet, use the written transcript and fallback steps below.';

function mediaMapToPractice(item) {
  return {
    id: item.practiceId,
    title: item.title,
    description: `${item.itemNumber} curriculum guided practice for Self-led IFS learning.`,
    category: 'Curriculum Guided Practice',
    level: 'All levels',
    duration: item.expectedDuration,
    durationSeconds: Number.parseInt(item.expectedDuration, 10) * 60 || 900,
    type: 'curriculum-practice',
    audioUrl: null,
    coverImageUrl: null,
    uploadThingFileKey: null,
    fallbackPractice: true,
    mp3Filename: item.mp3Filename,
    transcriptPath: item.transcriptPath,
    itemNumber: item.itemNumber,
    appArea: item.appArea,
    steps: [
      { id: 'step-1', text: 'Settle into a supported position and let your breath slow.', time: 0, duration: 45 },
      { id: 'step-2', text: 'Read or listen at a pace that keeps your system within your window of tolerance.', time: 45, duration: 45 },
      { id: 'step-3', text: 'Pause anytime a part needs reassurance, space, or grounding.', time: 90, duration: 45 },
    ],
  };
}

export default function CurriculumGuidedPracticePanel() {
  const basePractices = useMemo(() => getGuidedPracticeMediaBySection('B').map(mediaMapToPractice), []);
  const [practices, setPractices] = useState(basePractices);
  const [activePracticeId, setActivePracticeId] = useState(basePractices[0]?.id || '');

  useEffect(() => {
    let mounted = true;
    loadActiveMeditationMedia().then(({ data }) => {
      if (!mounted || !Array.isArray(data)) return;
      setPractices(mergeMeditationMediaWithLibrary(basePractices, data));
    });
    return () => { mounted = false; };
  }, [basePractices]);

  const activePractice = practices.find((practice) => practice.id === activePracticeId) || practices[0];

  if (!activePractice) return null;

  return (
    <section className="rounded-3xl border border-amber-100 bg-white/95 p-5 shadow-sm sm:p-6" aria-labelledby="curriculum-guided-practices-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Curriculum guided practices</p>
          <h2 id="curriculum-guided-practices-heading" className="mt-1 text-2xl font-bold text-gray-900">Audio + transcript practice library</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600">
            These Section B practices are available from the Curriculum area with transcripts always visible and UploadThing audio used only when mapped.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
          <Headphones className="h-4 w-4" /> 11 practices
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(220px,0.45fr)_minmax(0,1fr)]">
        <div className="space-y-2" role="list" aria-label="Curriculum guided practices">
          {practices.map((practice) => (
            <button
              type="button"
              key={practice.id}
              onClick={() => setActivePracticeId(practice.id)}
              className={`w-full rounded-2xl border p-3 text-left transition ${activePractice.id === practice.id ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white hover:border-amber-200'}`}
            >
              <span className="block text-xs font-bold uppercase tracking-wide text-amber-700">{practice.itemNumber}</span>
              <span className="mt-1 block text-sm font-semibold text-gray-900">{practice.title}</span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5" /> {practice.duration || practice.expectedDuration}
                <span>{practice.audioUrl ? 'Audio mapped' : 'Audio not mapped'}</span>
              </span>
            </button>
          ))}
        </div>

        <article className="rounded-3xl border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">{activePractice.itemNumber} · {activePractice.mp3Filename}</p>
              <h3 className="mt-1 text-xl font-bold text-gray-900">{activePractice.title}</h3>
              <p className="mt-1 text-sm text-gray-600">Transcript: {activePractice.transcriptPath}</p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{activePractice.duration}</span>
          </div>

          {activePractice.audioUrl ? (
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="mb-2 text-sm font-semibold text-emerald-800">Audio guidance</p>
              <audio src={activePractice.audioUrl} controls className="w-full" />
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{fallbackCopy}</p>
          )}

          <div className="mt-4 rounded-2xl bg-stone-50 p-4">
            <h4 className="text-sm font-bold text-gray-900">Written fallback steps</h4>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-700">
              {activePractice.steps.map((step) => <li key={step.id}>{step.text}</li>)}
            </ol>
          </div>

          <TranscriptPanel transcriptPath={activePractice.transcriptPath} className="mt-4" />
        </article>
      </div>
    </section>
  );
}
