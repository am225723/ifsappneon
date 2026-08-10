// Uploads the 3 Quick Practice narrations (previously audioUrl: null in
// guidedPracticeLibrary.js) to UploadThing, then upserts the resulting
// entries into src/lib/guidedPracticeMediaMap.js so they get picked up by
// guidedPracticeLibrary.js's guidedPracticeMediaByPracticeId merge.
//
// Requires UPLOADTHING_TOKEN (same token api/uploadthing.js reads) and all
// three of QSC_LOCAL_PATH, BBQ_LOCAL_PATH, ICC_LOCAL_PATH (local mp3 paths
// for Quick Self-Connection, Box Breathing quick, and Inner Child Check-in)
// to be set in the environment. Run from the repo root:
//
//   UPLOADTHING_TOKEN=... QSC_LOCAL_PATH=... BBQ_LOCAL_PATH=... ICC_LOCAL_PATH=... \
//     node scripts/upload-quick-practice-audio-to-uploadthing.mjs
//
// Safe to re-run: existing entries for the same practiceId are replaced
// rather than duplicated. All three files must upload successfully before
// the map file is touched; any failure aborts with a non-zero exit and
// leaves the map untouched.
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
  console.error('Run this from the ifsappneon repo root. Missing src/lib/guidedPracticeMediaMap.js');
  process.exit(1);
}

const entries = [
  {
    section: 'Q',
    itemNumber: 'Q1',
    practiceId: 'quick-self-connection',
    title: 'Quick Self-Connection',
    mp3Filename: 'quick-self-connection.mp3',
    localPathEnvVar: 'QSC_LOCAL_PATH',
    expectedDuration: '5 min'
  },
  {
    section: 'Q',
    itemNumber: 'Q2',
    practiceId: 'box-breathing-quick',
    title: 'Box Breathing',
    mp3Filename: 'box-breathing-quick.mp3',
    localPathEnvVar: 'BBQ_LOCAL_PATH',
    expectedDuration: '4 min'
  },
  {
    section: 'Q',
    itemNumber: 'Q3',
    practiceId: 'inner-child-check-in',
    title: 'Inner Child Check-in',
    mp3Filename: 'inner-child-check-in.mp3',
    localPathEnvVar: 'ICC_LOCAL_PATH',
    expectedDuration: '5 min'
  }
];

const missingPathVars = entries
  .map(({ localPathEnvVar }) => localPathEnvVar)
  .filter((envVar) => !process.env[envVar]);
if (missingPathVars.length > 0) {
  console.error(`Missing required environment variable(s): ${missingPathVars.join(', ')}.`);
  process.exit(1);
}

for (const entry of entries) {
  entry.localPath = process.env[entry.localPathEnvVar];
  if (!fs.existsSync(entry.localPath)) {
    console.error(`${entry.localPathEnvVar} points to a file that does not exist: ${entry.localPath}`);
    process.exit(1);
  }
}

const utapi = new UTApi();

function fileUrl(uploadResult) {
  return uploadResult?.data?.ufsUrl || uploadResult?.data?.url || null;
}

async function uploadOne({ practiceId, localPath, mp3Filename }) {
  const buffer = fs.readFileSync(localPath);
  const file = new File([buffer], mp3Filename, { type: 'audio/mpeg' });

  console.log(`Uploading ${mp3Filename}...`);
  const result = await utapi.uploadFiles(file);
  if (result.error) {
    throw new Error(`Failed to upload ${mp3Filename} (${practiceId}): ${result.error.message}`);
  }

  const url = fileUrl(result);
  const key = result?.data?.key || null;
  if (!url) {
    throw new Error(`Upload of ${mp3Filename} (${practiceId}) returned no URL.`);
  }
  console.log(`  -> ${url}`);
  return { practiceId, audioUrl: url, uploadThingFileKey: key };
}

// All three uploads must succeed before the map file is touched, so a
// partial failure never leaves guidedPracticeMediaMap.js half-updated.
const uploaded = [];
for (const entry of entries) {
  const result = await uploadOne(entry);
  uploaded.push({ ...entry, ...result });
}

let mapSource = fs.readFileSync(mapPath, 'utf8');

// Upsert: strip any existing entry for each practiceId first so re-running
// this script replaces rather than duplicates. Entries are flat object
// literals (no nested braces), so a non-nested-brace match is safe.
for (const { practiceId } of uploaded) {
  const existingEntryPattern = new RegExp(`\\s*\\{[^{}]*practiceId:\\s*'${practiceId}'[^{}]*\\},?`);
  mapSource = mapSource.replace(existingEntryPattern, '');
}

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

const insertionMarker = 'export const guidedPracticeMediaMap = [';
if (!mapSource.includes(insertionMarker)) {
  console.error(`Could not find "${insertionMarker}" in ${path.relative(root, mapPath)}; aborting without writing.`);
  process.exit(1);
}
mapSource = mapSource.replace(insertionMarker, `${insertionMarker}\n${newEntriesSource},`);

for (const { practiceId } of uploaded) {
  if (!mapSource.includes(`practiceId: '${practiceId}'`)) {
    console.error(`Sanity check failed: ${practiceId} is missing from the updated map source; aborting without writing.`);
    process.exit(1);
  }
}

fs.writeFileSync(mapPath, mapSource);
console.log(`\nUpserted ${uploaded.length} entr${uploaded.length === 1 ? 'y' : 'ies'} into ${path.relative(root, mapPath)}.`);
