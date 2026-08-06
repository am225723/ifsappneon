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
    audioUrl: 'https://0yrs6ceohq.ufs.sh/f/TQXmWDkNFrzPFNrjYl04BnsbQW0Izj5A9KXSHTMPpU2gNVoJ',
    uploadThingFileKey: 'TQXmWDkNFrzPFNrjYl04BnsbQW0Izj5A9KXSHTMPpU2gNVoJ'
  },
  {
    id: 'self-qualities',
    category: 'exercise',
    title: 'Cultivating Self Qualities',
    mp3Filename: 'self-qualities.mp3',
    localAudioUrl: '/audio/exercises/self-qualities.mp3',
    audioUrl: 'https://0yrs6ceohq.ufs.sh/f/TQXmWDkNFrzPjigFr65u0dwVr7fUC1JNqmxTBOMpeGQ9DiLn',
    uploadThingFileKey: 'TQXmWDkNFrzPjigFr65u0dwVr7fUC1JNqmxTBOMpeGQ9DiLn'
  },
  {
    id: 'meeting-inner-child',
    category: 'exercise',
    title: 'Meeting Your Inner Child',
    mp3Filename: 'meeting-inner-child.mp3',
    localAudioUrl: '/audio/exercises/meeting-inner-child.mp3',
    audioUrl: 'https://0yrs6ceohq.ufs.sh/f/TQXmWDkNFrzPT19dfgkNFrzP05cYyIRobDaHlmfeAGCXpdK1',
    uploadThingFileKey: 'TQXmWDkNFrzPT19dfgkNFrzP05cYyIRobDaHlmfeAGCXpdK1'
  },
  {
    id: 'reparenting',
    category: 'exercise',
    title: 'Reparenting Meditation',
    mp3Filename: 'reparenting.mp3',
    localAudioUrl: '/audio/exercises/reparenting.mp3',
    audioUrl: 'https://0yrs6ceohq.ufs.sh/f/TQXmWDkNFrzPW3DzwsoPR4oig2prsFVNS6WjtubOl8U9xdIG',
    uploadThingFileKey: 'TQXmWDkNFrzPW3DzwsoPR4oig2prsFVNS6WjtubOl8U9xdIG'
  },
  {
    id: 'inner-safe-place',
    category: 'exercise',
    title: 'Inner Safe Place',
    mp3Filename: 'inner-safe-place.mp3',
    localAudioUrl: '/audio/exercises/inner-safe-place.mp3',
    audioUrl: 'https://0yrs6ceohq.ufs.sh/f/TQXmWDkNFrzPE2GHV5h4ZdQis8pG9zIjwMvFL7xWk6CHEUJg',
    uploadThingFileKey: 'TQXmWDkNFrzPE2GHV5h4ZdQis8pG9zIjwMvFL7xWk6CHEUJg'
  },
  {
    id: 'wounds',
    category: 'assessment',
    title: 'Wound Patterns Assessment Intro',
    mp3Filename: 'wound-assessment-intro.mp3',
    localAudioUrl: '/audio/assessments/wound-assessment-intro.mp3',
    audioUrl: 'https://0yrs6ceohq.ufs.sh/f/TQXmWDkNFrzPce1U68QwrzMC4j5USyFJRIA16m72xLsiOufd',
    uploadThingFileKey: 'TQXmWDkNFrzPce1U68QwrzMC4j5USyFJRIA16m72xLsiOufd'
  },
  {
    id: 'parts',
    category: 'assessment',
    title: 'Parts System Assessment Intro',
    mp3Filename: 'parts-assessment-intro.mp3',
    localAudioUrl: '/audio/assessments/parts-assessment-intro.mp3',
    audioUrl: 'https://0yrs6ceohq.ufs.sh/f/TQXmWDkNFrzP693Wg8M7WjvhcLCy3ok4K5mN9MRiYfBgASXI',
    uploadThingFileKey: 'TQXmWDkNFrzP693Wg8M7WjvhcLCy3ok4K5mN9MRiYfBgASXI'
  },
  {
    id: 'self-energy',
    category: 'assessment',
    title: 'Self-Energy Assessment Intro',
    mp3Filename: 'self-energy-assessment-intro.mp3',
    localAudioUrl: '/audio/assessments/self-energy-assessment-intro.mp3',
    audioUrl: 'https://0yrs6ceohq.ufs.sh/f/TQXmWDkNFrzPzFWTAGCKeuNj4DvSoy9h2tRkxraw3X0WnMfs',
    uploadThingFileKey: 'TQXmWDkNFrzPzFWTAGCKeuNj4DvSoy9h2tRkxraw3X0WnMfs'
  },
  {
    id: 'attachment',
    category: 'assessment',
    title: 'Attachment Pattern Assessment Intro',
    mp3Filename: 'attachment-assessment-intro.mp3',
    localAudioUrl: '/audio/assessments/attachment-assessment-intro.mp3',
    audioUrl: 'https://0yrs6ceohq.ufs.sh/f/TQXmWDkNFrzPfuB7xMVz54V0hyU8pZlrDePq3gji9HMa2GEv',
    uploadThingFileKey: 'TQXmWDkNFrzPfuB7xMVz54V0hyU8pZlrDePq3gji9HMa2GEv'
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
