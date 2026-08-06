// Uploads the 9 exercise/assessment intro MP3s from public/audio/{exercises,assessments}
// to UploadThing, then rewrites src/lib/exerciseAssessmentAudioMap.js in place with the
// resulting audioUrl/uploadThingFileKey for each entry.
//
// Requires UPLOADTHING_TOKEN (same token api/uploadthing.js reads) to be set in the
// environment. Run from the repo root:
//
//   UPLOADTHING_TOKEN=... node scripts/migrate-exercise-assessment-audio-to-uploadthing.mjs
//
// After it finishes, verify playback in the app, then delete the now-redundant local
// files under public/audio/exercises and public/audio/assessments and commit.

import fs from 'node:fs';
import path from 'node:path';
import { File } from 'node:buffer';
import { UTApi } from 'uploadthing/server';

const root = process.cwd();
const mapPath = path.join(root, 'src/lib/exerciseAssessmentAudioMap.js');

if (!process.env.UPLOADTHING_TOKEN) {
  console.error(
    'Missing UPLOADTHING_TOKEN. Set it to the same UploadThing API token used by api/uploadthing.js, then re-run this script.'
  );
  process.exit(1);
}

if (!fs.existsSync(mapPath)) {
  throw new Error('Run this from the ifsappneon repo root. Missing src/lib/exerciseAssessmentAudioMap.js');
}

const entries = [
  { id: 'meeting-self', localPath: 'public/audio/exercises/meeting-self.mp3' },
  { id: 'self-qualities', localPath: 'public/audio/exercises/self-qualities.mp3' },
  { id: 'meeting-inner-child', localPath: 'public/audio/exercises/meeting-inner-child.mp3' },
  { id: 'reparenting', localPath: 'public/audio/exercises/reparenting.mp3' },
  { id: 'inner-safe-place', localPath: 'public/audio/exercises/inner-safe-place.mp3' },
  { id: 'wounds', localPath: 'public/audio/assessments/wound-assessment-intro.mp3' },
  { id: 'parts', localPath: 'public/audio/assessments/parts-assessment-intro.mp3' },
  { id: 'self-energy', localPath: 'public/audio/assessments/self-energy-assessment-intro.mp3' },
  { id: 'attachment', localPath: 'public/audio/assessments/attachment-assessment-intro.mp3' }
];

const utapi = new UTApi();

function fileUrl(uploadResult) {
  return uploadResult?.data?.ufsUrl || uploadResult?.data?.url || null;
}

async function uploadOne({ id, localPath }) {
  const absolutePath = path.join(root, localPath);
  if (!fs.existsSync(absolutePath)) {
    console.warn(`Skipping ${id}: ${localPath} not found.`);
    return null;
  }
  const buffer = fs.readFileSync(absolutePath);
  const filename = path.basename(localPath);
  const file = new File([buffer], filename, { type: 'audio/mpeg' });

  console.log(`Uploading ${filename}...`);
  const result = await utapi.uploadFiles(file);
  if (result.error) {
    console.error(`Failed to upload ${filename}: ${result.error.message}`);
    return null;
  }

  const url = fileUrl(result);
  const key = result?.data?.key || null;
  console.log(`  -> ${url}`);
  return { id, audioUrl: url, uploadThingFileKey: key };
}

const uploaded = [];
for (const entry of entries) {
  const result = await uploadOne(entry);
  if (result) uploaded.push(result);
}

if (uploaded.length === 0) {
  console.log('Nothing uploaded.');
  process.exit(0);
}

let mapSource = fs.readFileSync(mapPath, 'utf8');
for (const { id, audioUrl, uploadThingFileKey } of uploaded) {
  const entryRegex = new RegExp(
    `(id: '${id}',[\\s\\S]*?)audioUrl: null,\\n(\\s*)uploadThingFileKey: null`
  );
  if (!entryRegex.test(mapSource)) {
    console.warn(`Could not find a null placeholder for "${id}" in exerciseAssessmentAudioMap.js; update it manually.`);
    continue;
  }
  mapSource = mapSource.replace(
    entryRegex,
    `$1audioUrl: '${audioUrl}',\n$2uploadThingFileKey: '${uploadThingFileKey}'`
  );
}
fs.writeFileSync(mapPath, mapSource);
console.log(`\nUpdated ${path.relative(root, mapPath)} with ${uploaded.length} UploadThing URL(s).`);
console.log('Next: verify playback in the app, then delete the migrated files from public/audio/ and commit.');
