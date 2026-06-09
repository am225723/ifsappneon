import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Archive, CheckCircle, Clipboard, FileText, Headphones, Image as ImageIcon, Loader2, Save, UploadCloud } from 'lucide-react';
import { guidedPracticeLibrary } from '../lib/guidedPracticeLibrary';
import { guidedPracticeMediaMap, guidedPracticeMediaByFilename, guidedPracticeMediaByPracticeId } from '../lib/guidedPracticeMediaMap';
import {
  archiveMeditationMedia,
  createMeditationMedia,
  loadMeditationMedia,
  updateMeditationMedia
} from '../lib/meditationMedia';
import {
  getUploadThingAuthHeaders,
  getUploadThingFileKey,
  getUploadThingFileUrl,
  UploadButton
} from '../lib/uploadthing';
import { clientAuth } from '../lib/supabasePersonalization';

const canonicalPracticeOptions = guidedPracticeMediaMap.map((item, index) => ({
  id: item.practiceId,
  title: item.title,
  description: `${item.itemNumber} ${item.appArea} practice mapped to ${item.mp3Filename}.`,
  category: item.appArea === 'micro-learning' ? 'Micro-Learning' : item.appArea === 'curriculum' ? 'Curriculum Guided Practice' : 'Guided Meditation',
  level: 'All levels',
  duration: item.expectedDuration,
  type: item.appArea === 'micro-learning' ? 'micro-learning' : item.appArea === 'curriculum' ? 'curriculum-practice' : 'meditation',
  sort_order: index + 1,
  ...item
}));

const mediaPracticeOptions = [
  ...canonicalPracticeOptions,
  ...guidedPracticeLibrary.filter((practice) => !guidedPracticeMediaByPracticeId[practice.id])
];

const emptyForm = {
  id: null,
  practice_id: mediaPracticeOptions[0]?.id || '',
  title: mediaPracticeOptions[0]?.title || '',
  description: mediaPracticeOptions[0]?.description || '',
  category: mediaPracticeOptions[0]?.category || 'Self-Connection',
  level: mediaPracticeOptions[0]?.level || 'Beginner',
  duration_label: mediaPracticeOptions[0]?.duration || mediaPracticeOptions[0]?.expectedDuration || '5 min',
  practice_type: mediaPracticeOptions[0]?.type || 'meditation',
  audio_url: '',
  cover_image_url: '',
  uploadthing_audio_key: '',
  uploadthing_image_key: '',
  is_active: true,
  sort_order: 0
};

function userSafeUploadError(error) {
  if (error?.message?.toLowerCase().includes('unauthorized') || error?.message?.toLowerCase().includes('access')) {
    return 'Upload access is limited to Advisors, supervisors, and admins.';
  }
  return 'Upload failed. Please check the file type/size and try again.';
}

function normalizeUploadResult(files) {
  const file = Array.isArray(files) ? files[0] : files;
  if (!file) return { url: '', key: '' };
  return {
    url: getUploadThingFileUrl(file) || '',
    key: getUploadThingFileKey(file) || '',
    name: file.name || '',
    size: file.size || null,
    type: file.type || ''
  };
}

function practiceOptionLabel(practice) {
  return `${practice.itemNumber ? `${practice.itemNumber} · ` : ''}${practice.title} · ${practice.appArea || practice.category} · ${practice.duration || practice.expectedDuration}`;
}

export default function MeditationMediaManager() {
  const currentUser = clientAuth.getCurrentClient();
  const role = currentUser?.user_role;
  const canManage = ['therapist', 'advisor', 'admin', 'supervisor'].includes(role);
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [bulkCsv, setBulkCsv] = useState('');
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  const selectedPractice = useMemo(
    () => mediaPracticeOptions.find((practice) => practice.id === form.practice_id || practice.practiceId === form.practice_id),
    [form.practice_id]
  );
  const selectedMediaMap = guidedPracticeMediaByPracticeId[form.practice_id] || null;

  const recordsByPracticeId = useMemo(() => {
    const map = new Map();
    records.forEach((record) => {
      if (record.practice_id && !map.has(record.practice_id)) map.set(record.practice_id, record);
    });
    return map;
  }, [records]);

  const loadRecords = async () => {
    setLoading(true);
    setError('');
    const { data, error: loadError } = await loadMeditationMedia();
    if (loadError) setError(loadError.message || 'Unable to load meditation media records.');
    else setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => {
    // Existing app screens use this mount-load pattern; keep media loading scoped to authorized managers.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (canManage) loadRecords();
  }, [canManage]);

  if (!canManage) return <Navigate to="/" replace />;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const choosePractice = (practiceId) => {
    const practice = mediaPracticeOptions.find((item) => item.id === practiceId || item.practiceId === practiceId);
    setForm((current) => ({
      ...current,
      practice_id: practiceId,
      title: current.id ? current.title : (practice?.title || current.title),
      description: current.id ? current.description : (practice?.description || current.description),
      category: practice?.category || current.category,
      level: practice?.level || current.level,
      duration_label: practice?.duration || practice?.expectedDuration || current.duration_label,
      practice_type: practice?.type || current.practice_type,
      sort_order: practice?.sort_order || current.sort_order
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setMessage('');
    setError('');
    setUploadError('');
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const payload = {
      ...form,
      title: form.title.trim(),
      practice_id: form.practice_id.trim(),
      audio_url: form.audio_url.trim() || null,
      cover_image_url: form.cover_image_url.trim() || null,
      uploadthing_audio_key: form.uploadthing_audio_key.trim() || null,
      uploadthing_image_key: form.uploadthing_image_key.trim() || null
    };

    const result = form.id
      ? await updateMeditationMedia(form.id, payload)
      : await createMeditationMedia(payload);

    setSaving(false);
    if (result.error) {
      setError(result.error.message || 'Unable to save meditation media.');
      return;
    }
    const savedMessage = form.id ? 'Meditation media updated.' : 'Meditation media saved.';
    resetForm();
    await loadRecords();
    setMessage(savedMessage);
  };

  const editRecord = (record) => {
    setMessage('');
    setError('');
    setUploadError('');
    setForm({
      ...emptyForm,
      ...record,
      audio_url: record.audio_url || '',
      cover_image_url: record.cover_image_url || '',
      uploadthing_audio_key: record.uploadthing_audio_key || '',
      uploadthing_image_key: record.uploadthing_image_key || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const archiveRecord = async (record) => {
    setError('');
    setMessage('');
    const { error: archiveError } = await archiveMeditationMedia(record.id);
    if (archiveError) setError(archiveError.message || 'Unable to deactivate meditation media.');
    else {
      setMessage('Meditation media deactivated.');
      await loadRecords();
    }
  };

  const copyUrl = async (url) => {
    if (!url) return;
    await navigator.clipboard?.writeText(url);
    setMessage('URL copied to clipboard.');
  };


  const parseBulkCsv = () => {
    const rows = bulkCsv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const parsedRows = rows
      .filter((line, index) => !(index === 0 && /^mp3Filename\s*,\s*audioUrl/i.test(line)))
      .map((line, index) => {
        const [mp3Filename = '', audioUrl = '', uploadThingAudioKey = ''] = line.split(',').map((value) => value.trim());
        const mapItem = guidedPracticeMediaByFilename[mp3Filename] || null;
        const hasSafeUrl = /^https?:\/\//i.test(audioUrl);
        return {
          rowNumber: index + 1,
          mp3Filename,
          audioUrl,
          uploadThingAudioKey,
          matched: Boolean(mapItem && hasSafeUrl),
          mapItem,
          issue: !mapItem ? 'Filename does not match the canonical 27-item map.' : !hasSafeUrl ? 'Audio URL must start with http:// or https://.' : ''
        };
      });
    setBulkPreview(parsedRows);
    if (!parsedRows.length) setUploadError('Paste at least one CSV row with mp3Filename,audioUrl,uploadThingAudioKey.');
    else setUploadError('');
  };

  const saveBulkMappings = async () => {
    const matchedRows = bulkPreview.filter((row) => row.matched);
    if (!matchedRows.length) {
      setUploadError('Preview matched rows before saving.');
      return;
    }
    setBulkSaving(true);
    setUploadError('');
    setMessage('');
    let saved = 0;
    for (const row of matchedRows) {
      const item = row.mapItem;
      const existing = recordsByPracticeId.get(item.practiceId);
      const payload = {
        practice_id: item.practiceId,
        title: item.title,
        description: `${item.itemNumber} ${item.appArea} UploadThing audio mapping for ${item.mp3Filename}.`,
        category: item.appArea === 'micro-learning' ? 'Micro-Learning' : item.appArea === 'curriculum' ? 'Curriculum Guided Practice' : 'Guided Meditation',
        level: 'All levels',
        duration_label: item.expectedDuration,
        practice_type: item.appArea === 'micro-learning' ? 'micro-learning' : item.appArea === 'curriculum' ? 'curriculum-practice' : 'meditation',
        audio_url: row.audioUrl,
        uploadthing_audio_key: row.uploadThingAudioKey || null,
        is_active: true,
        sort_order: Number.parseInt(item.itemNumber.slice(1), 10) || 0
      };
      const result = existing ? await updateMeditationMedia(existing.id, payload) : await createMeditationMedia(payload);
      if (result.error) {
        setUploadError(result.error.message || `Unable to save ${item.mp3Filename}.`);
        setBulkSaving(false);
        return;
      }
      saved += 1;
    }
    await loadRecords();
    setBulkSaving(false);
    setMessage(`Bulk mapped ${saved} uploaded audio file${saved === 1 ? '' : 's'}.`);
  };

  const uploadAppearance = {
    button: 'rounded-2xl bg-brand-gold-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-gold-700 ut-ready:bg-brand-gold-600 ut-uploading:bg-brand-stone-400',
    allowedContent: 'text-xs text-brand-stone-500 dark:text-slate-400',
    container: 'items-start gap-2'
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:py-14">
      <header className="mb-8 rounded-[2rem] border border-brand-gold-100 bg-gradient-to-br from-white via-brand-sanctuary to-brand-gold-50/60 p-6 shadow-sm dark:border-brand-gold-900/40 dark:from-brand-cardDark dark:via-brand-midnight dark:to-brand-gold-950/20 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold-700 dark:text-brand-gold-500">Advisor/Admin Tools</p>
        <h1 className="mt-3 font-serif text-3xl font-semibold text-brand-stone-900 dark:text-slate-100 md:text-4xl">Meditation Media Library</h1>
        <p className="mt-3 max-w-3xl text-brand-stone-600 dark:text-slate-300">
          Map UploadThing audio URLs and optional cover images for all 27 meditation, curriculum, and micro-learning practices. Captions use .srt files stored in public/docs/captions. The app highlights words approximately from phrase-level timings.
        </p>
      </header>

      {(error || uploadError || message) && (
        <div className={`mb-6 rounded-2xl border p-4 text-sm font-semibold ${error || uploadError ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200'}`}>
          {error || uploadError || message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <form onSubmit={submitForm} className="rounded-[2rem] border border-brand-stone-200 bg-white/85 p-5 shadow-sm dark:border-slate-800 dark:bg-brand-cardDark/90 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">{form.id ? 'Edit media record' : 'Add media record'}</h2>
              <p className="text-sm text-brand-stone-500 dark:text-slate-400">Attach uploaded URLs to a static practice or create a custom card.</p>
            </div>
            {form.id && <button type="button" onClick={resetForm} className="rounded-2xl border border-brand-stone-200 px-3 py-2 text-sm font-semibold text-brand-stone-700 dark:border-slate-700 dark:text-slate-200">New</button>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="md:col-span-2 text-sm font-semibold text-brand-stone-700 dark:text-slate-200">
              Existing practice
              <select value={form.practice_id} onChange={(event) => choosePractice(event.target.value)} className="mt-1 w-full rounded-2xl border border-brand-stone-200 bg-white px-3 py-2 text-sm text-brand-stone-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                {mediaPracticeOptions.map((practice) => <option key={practice.id || practice.practiceId} value={practice.id || practice.practiceId}>{practiceOptionLabel(practice)}</option>)}
              </select>
            </label>

            {selectedMediaMap && (
              <div className="md:col-span-2 rounded-2xl border border-brand-gold-100 bg-brand-gold-50/60 p-3 text-xs text-brand-stone-700 dark:border-brand-gold-900/40 dark:bg-brand-gold-950/20 dark:text-slate-200">
                <p className="font-bold uppercase tracking-wide text-brand-gold-700 dark:text-brand-gold-500">Expected Phase 22F mapping</p>
                <p className="mt-1">MP3 filename: <span className="font-semibold">{selectedMediaMap.mp3Filename}</span></p>
                <p>Transcript path: <span className="font-semibold">{selectedMediaMap.transcriptPath}</span></p>
                <p>Captions path: <span className="font-semibold">{selectedMediaMap.captionsPath}</span></p>
                <p>Expected SRT filename: <span className="font-semibold">{selectedMediaMap.captionsPath?.split('/').pop()}</span></p>
                <p className="mt-2 font-semibold text-amber-800 dark:text-amber-200">Caption status: Transcript exists when the TXT file is present · Captions path configured · Captions file missing until the matching SRT is placed in public/docs/captions.</p>
              </div>
            )}

            <label className="text-sm font-semibold text-brand-stone-700 dark:text-slate-200">
              Practice ID
              <input value={form.practice_id} onChange={(event) => updateField('practice_id', event.target.value)} className="mt-1 w-full rounded-2xl border border-brand-stone-200 bg-white px-3 py-2 text-sm text-brand-stone-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" required />
            </label>
            <label className="text-sm font-semibold text-brand-stone-700 dark:text-slate-200">
              Title
              <input value={form.title} onChange={(event) => updateField('title', event.target.value)} className="mt-1 w-full rounded-2xl border border-brand-stone-200 bg-white px-3 py-2 text-sm text-brand-stone-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" required />
            </label>
            <label className="md:col-span-2 text-sm font-semibold text-brand-stone-700 dark:text-slate-200">
              Description
              <textarea value={form.description || ''} onChange={(event) => updateField('description', event.target.value)} rows={3} className="mt-1 w-full rounded-2xl border border-brand-stone-200 bg-white px-3 py-2 text-sm text-brand-stone-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            </label>
            <label className="text-sm font-semibold text-brand-stone-700 dark:text-slate-200">
              Category
              <input value={form.category || ''} onChange={(event) => updateField('category', event.target.value)} className="mt-1 w-full rounded-2xl border border-brand-stone-200 bg-white px-3 py-2 text-sm text-brand-stone-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            </label>
            <label className="text-sm font-semibold text-brand-stone-700 dark:text-slate-200">
              Duration label
              <input value={form.duration_label || ''} onChange={(event) => updateField('duration_label', event.target.value)} className="mt-1 w-full rounded-2xl border border-brand-stone-200 bg-white px-3 py-2 text-sm text-brand-stone-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            </label>
            <label className="text-sm font-semibold text-brand-stone-700 dark:text-slate-200">
              Level
              <input value={form.level || ''} onChange={(event) => updateField('level', event.target.value)} className="mt-1 w-full rounded-2xl border border-brand-stone-200 bg-white px-3 py-2 text-sm text-brand-stone-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            </label>
            <label className="text-sm font-semibold text-brand-stone-700 dark:text-slate-200">
              Practice type
              <input value={form.practice_type || ''} onChange={(event) => updateField('practice_type', event.target.value)} className="mt-1 w-full rounded-2xl border border-brand-stone-200 bg-white px-3 py-2 text-sm text-brand-stone-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            </label>
          </div>

          <section className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-brand-stone-200 p-4 dark:border-slate-700">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-stone-800 dark:text-slate-100"><Headphones className="h-4 w-4" /> Audio upload</div>
              <UploadButton
                endpoint="meditationAudioUploader"
                url="/api/uploadthing"
                headers={getUploadThingAuthHeaders}
                appearance={uploadAppearance}
                onClientUploadComplete={(files) => {
                  const uploaded = normalizeUploadResult(files);
                  updateField('audio_url', uploaded.url);
                  updateField('uploadthing_audio_key', uploaded.key);
                  setUploadError('');
                  setMessage('Audio upload complete. Save the record to publish this URL.');
                }}
                onUploadError={(uploadError) => setUploadError(userSafeUploadError(uploadError))}
              />
              <input value={form.audio_url || ''} onChange={(event) => updateField('audio_url', event.target.value)} placeholder="Audio URL" className="mt-3 w-full rounded-2xl border border-brand-stone-200 bg-white px-3 py-2 text-xs text-brand-stone-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            </div>
            <div className="rounded-3xl border border-brand-stone-200 p-4 dark:border-slate-700">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-stone-800 dark:text-slate-100"><ImageIcon className="h-4 w-4" /> Cover image upload</div>
              <UploadButton
                endpoint="meditationImageUploader"
                url="/api/uploadthing"
                headers={getUploadThingAuthHeaders}
                appearance={uploadAppearance}
                onClientUploadComplete={(files) => {
                  const uploaded = normalizeUploadResult(files);
                  updateField('cover_image_url', uploaded.url);
                  updateField('uploadthing_image_key', uploaded.key);
                  setUploadError('');
                  setMessage('Cover image upload complete. Save the record to publish this URL.');
                }}
                onUploadError={(uploadError) => setUploadError(userSafeUploadError(uploadError))}
              />
              <input value={form.cover_image_url || ''} onChange={(event) => updateField('cover_image_url', event.target.value)} placeholder="Cover image URL" className="mt-3 w-full rounded-2xl border border-brand-stone-200 bg-white px-3 py-2 text-xs text-brand-stone-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            </div>
          </section>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-brand-stone-700 dark:text-slate-200">
              <input type="checkbox" checked={form.is_active} onChange={(event) => updateField('is_active', event.target.checked)} className="h-4 w-4 rounded border-brand-stone-300" />
              Active on Meditation page
            </label>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-brand-gold-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-gold-700 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save media
            </button>
          </div>
        </form>

        <aside className="rounded-[2rem] border border-brand-stone-200 bg-white/85 p-5 shadow-sm dark:border-slate-800 dark:bg-brand-cardDark/90">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-brand-gold-700 dark:text-brand-gold-500"><UploadCloud className="h-4 w-4" /> Preview</div>
          {form.cover_image_url && <img src={form.cover_image_url} alt="Meditation media cover preview" className="mb-4 h-40 w-full rounded-3xl object-cover" />}
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold-700 dark:text-brand-gold-500">{form.category || selectedPractice?.category}</p>
          <h2 className="mt-2 text-xl font-semibold text-brand-stone-900 dark:text-slate-100">{form.title || selectedPractice?.title}</h2>
          <p className="mt-2 text-sm text-brand-stone-600 dark:text-slate-400">{form.description || selectedPractice?.description}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-brand-stone-600 dark:text-slate-300">
            <span className="rounded-full bg-brand-stone-100 px-3 py-1 dark:bg-slate-800">{form.level}</span>
            <span className="rounded-full bg-brand-stone-100 px-3 py-1 dark:bg-slate-800">{form.duration_label}</span>
            <span className="rounded-full bg-brand-stone-100 px-3 py-1 capitalize dark:bg-slate-800">{form.practice_type}</span>
            {selectedMediaMap && <span className="rounded-full bg-brand-stone-100 px-3 py-1 dark:bg-slate-800">{selectedMediaMap.mp3Filename}</span>}
            {selectedMediaMap && <span className="rounded-full bg-brand-stone-100 px-3 py-1 dark:bg-slate-800">{selectedMediaMap.transcriptPath}</span>}
            {selectedMediaMap && <span className="rounded-full bg-brand-stone-100 px-3 py-1 dark:bg-slate-800">{selectedMediaMap.captionsPath}</span>}
            {selectedMediaMap && <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Captions file missing until SRT is published</span>}
            {form.audio_url && <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">Audio attached</span>}
          </div>
        </aside>
      </div>


      <section className="mt-8 rounded-[2rem] border border-brand-stone-200 bg-white/85 p-5 shadow-sm dark:border-slate-800 dark:bg-brand-cardDark/90 md:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">Bulk Map Uploaded Audio</h2>
            <p className="mt-1 text-sm text-brand-stone-600 dark:text-slate-400">Paste CSV rows from UploadThing using mp3Filename,audioUrl,uploadThingAudioKey. The filename is matched against the canonical 27-item map before saving.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-gold-50 px-3 py-1 text-xs font-bold text-brand-gold-700 dark:bg-brand-gold-950/30 dark:text-brand-gold-500"><FileText className="h-4 w-4" /> Safe URL mapping</span>
        </div>
        <textarea
          value={bulkCsv}
          onChange={(event) => setBulkCsv(event.target.value)}
          className="mt-4 min-h-36 w-full rounded-2xl border border-brand-stone-200 bg-white px-3 py-2 text-xs font-mono text-brand-stone-900 outline-none focus:border-brand-gold-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          placeholder={"mp3Filename,audioUrl,uploadThingAudioKey\n01_Meeting_Your_Self.mp3,https://utfs.io/f/...,abc123"}
        />
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" onClick={parseBulkCsv} className="rounded-2xl border border-brand-stone-200 px-4 py-2 text-sm font-semibold text-brand-stone-700 hover:bg-brand-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Preview matches</button>
          <button type="button" onClick={saveBulkMappings} disabled={bulkSaving || !bulkPreview.some((row) => row.matched)} className="inline-flex items-center gap-2 rounded-2xl bg-brand-gold-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-gold-700 disabled:opacity-60">
            {bulkSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save matched rows
          </button>
        </div>
        {bulkPreview.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-brand-stone-200 dark:border-slate-700">
            <table className="min-w-full divide-y divide-brand-stone-200 text-left text-xs dark:divide-slate-700">
              <thead className="bg-brand-stone-50 text-brand-stone-600 dark:bg-slate-900 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-2">Filename</th>
                  <th className="px-3 py-2">Matched practice</th>
                  <th className="px-3 py-2">Audio URL</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-stone-100 dark:divide-slate-800">
                {bulkPreview.map((row) => (
                  <tr key={`${row.rowNumber}-${row.mp3Filename}`}>
                    <td className="px-3 py-2 font-mono text-brand-stone-700 dark:text-slate-200">{row.mp3Filename || 'Missing filename'}</td>
                    <td className="px-3 py-2 text-brand-stone-700 dark:text-slate-200">{row.mapItem ? `${row.mapItem.itemNumber} · ${row.mapItem.title}` : 'No match'}</td>
                    <td className="max-w-xs truncate px-3 py-2 text-brand-stone-500 dark:text-slate-400">{row.audioUrl || 'Missing URL'}</td>
                    <td className={`px-3 py-2 font-semibold ${row.matched ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>{row.matched ? 'Ready to save' : row.issue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8 rounded-[2rem] border border-brand-stone-200 bg-white/85 p-5 shadow-sm dark:border-slate-800 dark:bg-brand-cardDark/90 md:p-6">
        <h2 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">Existing media</h2>
        {loading ? (
          <div className="mt-5 flex items-center gap-2 text-brand-stone-600 dark:text-slate-300"><Loader2 className="h-4 w-4 animate-spin" /> Loading media records…</div>
        ) : records.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-brand-stone-50 p-4 text-sm text-brand-stone-600 dark:bg-slate-900/60 dark:text-slate-300">No meditation media records have been saved yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {records.map((record) => (
              <article key={record.id} className="rounded-3xl border border-brand-stone-200 p-4 dark:border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100">{record.title}</h3>
                    <p className="mt-1 text-xs text-brand-stone-500 dark:text-slate-400">{record.practice_id} · {record.duration_label || 'duration unset'}</p>
                    {guidedPracticeMediaByPracticeId[record.practice_id] && (
                      <p className="mt-1 text-xs text-brand-stone-500 dark:text-slate-400">Expected: {guidedPracticeMediaByPracticeId[record.practice_id].mp3Filename} · {guidedPracticeMediaByPracticeId[record.practice_id].transcriptPath} · {guidedPracticeMediaByPracticeId[record.practice_id].captionsPath}</p>
                    )}
                  </div>
                  {record.is_active ? <CheckCircle className="h-5 w-5 text-emerald-500" /> : <Archive className="h-5 w-5 text-brand-stone-400" />}
                </div>
                <p className="mt-3 text-sm text-brand-stone-600 dark:text-slate-400">{record.description || 'No description.'}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className={`rounded-full px-3 py-1 ${record.audio_url ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200'}`}>{record.audio_url ? 'audioUrl mapped' : 'audioUrl missing'}</span>
                  <span className={`rounded-full px-3 py-1 ${record.uploadthing_audio_key ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200'}`}>{record.uploadthing_audio_key ? 'UploadThing key saved' : 'UploadThing key missing'}</span>
                  <span className="rounded-full bg-brand-stone-100 px-3 py-1 text-brand-stone-700 dark:bg-slate-800 dark:text-slate-200">Transcript exists when TXT is in public/docs</span>
                  <span className="rounded-full bg-brand-stone-100 px-3 py-1 text-brand-stone-700 dark:bg-slate-800 dark:text-slate-200">Captions path configured</span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Captions file missing until SRT is published</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => editRecord(record)} className="rounded-2xl border border-brand-stone-200 px-3 py-2 text-xs font-semibold text-brand-stone-700 dark:border-slate-700 dark:text-slate-200">Edit</button>
                  <button type="button" onClick={() => archiveRecord(record)} className="rounded-2xl border border-brand-stone-200 px-3 py-2 text-xs font-semibold text-brand-stone-700 dark:border-slate-700 dark:text-slate-200">Deactivate</button>
                  {record.audio_url && <button type="button" onClick={() => copyUrl(record.audio_url)} className="inline-flex items-center gap-1 rounded-2xl border border-brand-stone-200 px-3 py-2 text-xs font-semibold text-brand-stone-700 dark:border-slate-700 dark:text-slate-200"><Clipboard className="h-3 w-3" /> Audio URL</button>}
                  {record.cover_image_url && <button type="button" onClick={() => copyUrl(record.cover_image_url)} className="inline-flex items-center gap-1 rounded-2xl border border-brand-stone-200 px-3 py-2 text-xs font-semibold text-brand-stone-700 dark:border-slate-700 dark:text-slate-200"><Clipboard className="h-3 w-3" /> Image URL</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="mt-6">
        <Link to="/meditation" className="text-sm font-semibold text-brand-gold-700 hover:text-brand-gold-800 dark:text-brand-gold-500">View Meditation page</Link>
      </div>
    </main>
  );
}
