import { guidedPracticeMediaByPracticeId } from './guidedPracticeMediaMap';
const API_PATH = '/api/meditation-media';

async function getAuthToken() {
  try {
    const clerk = window.Clerk;
    if (clerk?.session?.getToken) return await clerk.session.getToken();
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[meditationMedia] Clerk token unavailable', { message: error?.message || 'token lookup failed' });
  }
  return null;
}

async function meditationMediaRequest(payload) {
  const token = await getAuthToken();
  const response = await fetch(API_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      data: null,
      error: {
        message: json.error || 'Meditation media is not available right now.',
        status: response.status
      }
    };
  }
  return { data: json.data || [], error: null };
}

export function loadMeditationMedia() {
  return meditationMediaRequest({ action: 'list_all_for_admin' });
}

export function loadActiveMeditationMedia() {
  return meditationMediaRequest({ action: 'list_active' });
}

export function createMeditationMedia(record) {
  return meditationMediaRequest({ action: 'create', record });
}

export function updateMeditationMedia(id, updates) {
  return meditationMediaRequest({ action: 'update', id, updates });
}

export function archiveMeditationMedia(id) {
  return meditationMediaRequest({ action: 'archive', id });
}

function defaultStepsForMedia(row) {
  return [
    {
      id: 'step-1',
      text: `Settle in and begin ${row.title || 'this guided meditation'} when you feel ready.`,
      time: 0,
      duration: 45
    },
    {
      id: 'step-2',
      text: 'Notice your breath, your body, and any parts that are present with gentle curiosity.',
      time: 45,
      duration: 45
    },
    {
      id: 'step-3',
      text: 'Let the guidance support you, and return to these written steps if audio is unavailable.',
      time: 90,
      duration: 45
    }
  ];
}

function parseDurationSeconds(durationLabel) {
  const match = String(durationLabel || '').match(/(\d+)/);
  if (!match) return 300;
  return Math.max(60, Number.parseInt(match[1], 10) * 60);
}

function mediaRowToPractice(row) {
  const practiceId = row.practice_id || row.id;
  const duration = row.duration_label || '5 min';
  const mediaMap = guidedPracticeMediaByPracticeId[practiceId] || {};
  return {
    id: practiceId,
    title: row.title || 'Guided Meditation',
    description: row.description || 'A guided practice added by your Advisor team.',
    category: row.category || 'Self-Connection',
    level: row.level || 'All levels',
    duration,
    mp3Filename: mediaMap.mp3Filename || row.mp3_filename || null,
    transcriptPath: mediaMap.transcriptPath || row.transcript_path || null,
    captionsPath: mediaMap.captionsPath || row.captions_path || null,
    itemNumber: mediaMap.itemNumber || null,
    appArea: mediaMap.appArea || null,
    durationSeconds: parseDurationSeconds(duration),
    type: row.practice_type || 'meditation',
    route: `/meditation/${practiceId}`,
    audioUrl: row.audio_url || null,
    coverImageUrl: row.cover_image_url || null,
    uploadThingFileKey: row.uploadthing_audio_key || null,
    uploadThingImageKey: row.uploadthing_image_key || null,
    fallbackPractice: true,
    mediaRecordId: row.id,
    steps: defaultStepsForMedia(row)
  };
}

export function mergeMeditationMediaWithLibrary(staticLibrary = [], mediaRows = []) {
  const basePractices = Array.isArray(staticLibrary) ? staticLibrary : [];
  const rows = Array.isArray(mediaRows) ? mediaRows.filter((row) => row?.is_active !== false) : [];
  const byPracticeId = new Map();

  rows.forEach((row) => {
    const practiceId = row.practice_id;
    if (!practiceId) return;
    const existing = byPracticeId.get(practiceId);
    if (!existing || (row.sort_order || 0) >= (existing.sort_order || 0)) byPracticeId.set(practiceId, row);
  });

  const merged = basePractices.map((practice) => {
    const media = byPracticeId.get(practice.id);
    if (!media) return practice;
    return {
      ...practice,
      title: media.title || practice.title,
      description: media.description || practice.description,
      category: media.category || practice.category,
      level: media.level || practice.level,
      duration: media.duration_label || practice.duration,
      durationSeconds: media.duration_label ? parseDurationSeconds(media.duration_label) : practice.durationSeconds,
      type: media.practice_type || practice.type,
      audioUrl: media.audio_url || practice.audioUrl,
      mp3Filename: (guidedPracticeMediaByPracticeId[practice.id]?.mp3Filename || practice.mp3Filename || null),
      transcriptPath: (guidedPracticeMediaByPracticeId[practice.id]?.transcriptPath || practice.transcriptPath || null),
      captionsPath: (guidedPracticeMediaByPracticeId[practice.id]?.captionsPath || practice.captionsPath || media.captions_path || null),
      itemNumber: (guidedPracticeMediaByPracticeId[practice.id]?.itemNumber || practice.itemNumber || null),
      appArea: (guidedPracticeMediaByPracticeId[practice.id]?.appArea || practice.appArea || null),
      coverImageUrl: media.cover_image_url || practice.coverImageUrl,
      uploadThingFileKey: media.uploadthing_audio_key || practice.uploadThingFileKey,
      uploadThingImageKey: media.uploadthing_image_key || practice.uploadThingImageKey || null,
      mediaRecordId: media.id
    };
  });

  const staticIds = new Set(basePractices.map((practice) => practice.id));
  const customPractices = rows
    .filter((row) => row.practice_id && !staticIds.has(row.practice_id))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map(mediaRowToPractice);

  return [...merged, ...customPractices];
}
