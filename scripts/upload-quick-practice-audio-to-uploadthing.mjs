// Uploads the 3 Quick Practice narrations (previously audioUrl: null in
// guidedPracticeLibrary.js) to UploadThing, then inserts the resulting
// entries into src/lib/guidedPracticeMediaMap.js so they get picked up by
// guidedPracticeLibrary.js's guidedPracticeMediaByPracticeId merge.
//
// Requires UPLOADTHING_TOKEN (same token api/uploadthing.js reads) to be set
// in the environment. Run from the repo root:
//
//   UPLOADTHING_TOKEN=... node scripts/upload-quick-practice-audio-to-uploadthing.mjs
//
// After it finishes, verify playback in the app for /meditation/quick-self-connection,
// /meditation/box-breathing-quick, and /meditation/inner-child-check-in.

import fs from 'node:fs';
import path from 'node:path';
import { File } from 'node:buffer';
import { UTApi } from 'uploadthing/server';

const root = process.cwd();
const mapPath = path.join(root, 'src/lib/guidedPracticeMediaMap.js');

if (!process.env.UPLOADTHING_TOKEN) {
  console.error('Missing UPLOADTHING_TOKEN. Set it, then re-run this script.');
  process.exit(1);
}

if (!fs.existsSync(mapPath)) {
  throw new Error('Run this from the ifsappneon repo root. Missing src/lib/guidedPracticeMediaMap.js');
}

const entries = [
  {
    section: 'Q',
    itemNumber: 'Q1',
    practiceId: 'quick-self-connection',
    title: 'Quick Self-Connection',
    mp3Filename: 'quick-self-connection.mp3',
    localPath: process.env.QSC_LOCAL_PATH,
    expectedDuration: '5 min'
  },
  {
    section: 'Q',
    itemNumber: 'Q2',
    practiceId: 'box-breathing-quick',
    title: 'Box Breathing',
    mp3Filename: 'box-breathing-quick.mp3',
    localPath: process.env.BBQ_LOCAL_PATH,
    expectedDuration: '4 min'
  },
  {
    section: 'Q',
    itemNumber: 'Q3',
    practiceId: 'inner-child-check-in',
    title: 'Inner Child Check-in',
    mp3Filename: 'inner-child-check-in.mp3',
    localPath: process.env.ICC_LOCAL_PATH,
    expectedDuration: '5 min'
  }
];

const utapi = new UTApi();

function fileUrl(uploadResult) {
  return uploadResult?.data?.ufsUrl || uploadResult?.data?.url || null;
}

async function uploadOne({ practiceId, localPath, mp3Filename }) {
  if (!localPath || !fs.existsSync(localPath)) {
    console.warn(`Skipping ${practiceId}: local path not found (${localPath}).`);
    return null;
  }
  const buffer = fs.readFileSync(localPath);
  const file = new File([buffer], mp3Filename, { type: 'audio/mpeg' });

  console.log(`Uploading ${mp3Filename}...`);
  const result = await utapi.uploadFiles(file);
  if (result.error) {
    console.error(`Failed to upload ${mp3Filename}: ${result.error.message}`);
    return null;
  }

  const url = fileUrl(result);
  const key = result?.data?.key || null;
  console.log(`  -> ${url}`);
  return { practiceId, audioUrl: url, uploadThingFileKey: key };
}

const uploaded = [];
for (const entry of entries) {
  const result = await uploadOne(entry);
  if (result) uploaded.push({ ...entry, ...result });
}

if (uploaded.length === 0) {
  console.log('Nothing uploaded.');
  process.exit(0);
}

let mapSource = fs.readFileSync(mapPath, 'utf8');
const newEntriesSource = uploaded
  .map(({ section, itemNumber, practiceId, title, mp3Filename, audioUrl, uploadThingFileKey, expectedDuration }) => `  {
    section: '${section}',
    itemNumber: '${itemNumber}',
    practiceId: '${practiceId}',
    title: '${title}',
    mp3Filename: '${mp3Filename}',
    audioUrl: '${audioUrl}',
    uploadThingFileKey: '${uploadThingFileKey}',
    expectedDuration: '${expectedDuration}',
    appArea: 'meditation'
  }`)
  .join(',\n');

mapSource = mapSource.replace(
  'export const guidedPracticeMediaMap = [',
  `export const guidedPracticeMediaMap = [\n${newEntriesSource},`
);
fs.writeFileSync(mapPath, mapSource);
console.log(`\nInserted ${uploaded.length} entr${uploaded.length === 1 ? 'y' : 'ies'} into ${path.relative(root, mapPath)}.`);
