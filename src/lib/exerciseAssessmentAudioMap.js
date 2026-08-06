// Static map for the 9 exercise/assessment intro MP3s being migrated off
// public/audio/* (committed static files) onto UploadThing-hosted URLs.
//
// audioUrl / uploadThingFileKey start out null. Run
// `node scripts/migrate-exercise-assessment-audio-to-uploadthing.mjs`
// (with UPLOADTHING_TOKEN set) to upload the local files and have the
// script fill these fields in automatically. Until then, consumers fall
// back to localAudioUrl via getExerciseAssessmentAudioUrl().
export const exerciseAssessmentAudioMap = [
  {
    id: 'meeting-self',
    category: 'exercise',
    title: 'Meeting Your Self',
    mp3Filename: 'meeting-self.mp3',
    localAudioUrl: '/audio/exercises/meeting-self.mp3',
    audioUrl: null,
    uploadThingFileKey: null
  },
  {
    id: 'self-qualities',
    category: 'exercise',
    title: 'Cultivating Self Qualities',
    mp3Filename: 'self-qualities.mp3',
    localAudioUrl: '/audio/exercises/self-qualities.mp3',
    audioUrl: null,
    uploadThingFileKey: null
  },
  {
    id: 'meeting-inner-child',
    category: 'exercise',
    title: 'Meeting Your Inner Child',
    mp3Filename: 'meeting-inner-child.mp3',
    localAudioUrl: '/audio/exercises/meeting-inner-child.mp3',
    audioUrl: null,
    uploadThingFileKey: null
  },
  {
    id: 'reparenting',
    category: 'exercise',
    title: 'Reparenting Meditation',
    mp3Filename: 'reparenting.mp3',
    localAudioUrl: '/audio/exercises/reparenting.mp3',
    audioUrl: null,
    uploadThingFileKey: null
  },
  {
    id: 'inner-safe-place',
    category: 'exercise',
    title: 'Inner Safe Place',
    mp3Filename: 'inner-safe-place.mp3',
    localAudioUrl: '/audio/exercises/inner-safe-place.mp3',
    audioUrl: null,
    uploadThingFileKey: null
  },
  {
    id: 'wounds',
    category: 'assessment',
    title: 'Wound Patterns Assessment Intro',
    mp3Filename: 'wound-assessment-intro.mp3',
    localAudioUrl: '/audio/assessments/wound-assessment-intro.mp3',
    audioUrl: null,
    uploadThingFileKey: null
  },
  {
    id: 'parts',
    category: 'assessment',
    title: 'Parts System Assessment Intro',
    mp3Filename: 'parts-assessment-intro.mp3',
    localAudioUrl: '/audio/assessments/parts-assessment-intro.mp3',
    audioUrl: null,
    uploadThingFileKey: null
  },
  {
    id: 'self-energy',
    category: 'assessment',
    title: 'Self-Energy Assessment Intro',
    mp3Filename: 'self-energy-assessment-intro.mp3',
    localAudioUrl: '/audio/assessments/self-energy-assessment-intro.mp3',
    audioUrl: null,
    uploadThingFileKey: null
  },
  {
    id: 'attachment',
    category: 'assessment',
    title: 'Attachment Pattern Assessment Intro',
    mp3Filename: 'attachment-assessment-intro.mp3',
    localAudioUrl: '/audio/assessments/attachment-assessment-intro.mp3',
    audioUrl: null,
    uploadThingFileKey: null
  }
];

export const exerciseAssessmentAudioById = Object.fromEntries(
  exerciseAssessmentAudioMap.map((item) => [item.id, item])
);

export function getExerciseAssessmentAudioUrl(id) {
  const entry = exerciseAssessmentAudioById[id];
  if (!entry) return null;
  return entry.audioUrl || entry.localAudioUrl;
}
