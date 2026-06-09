function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function cleanCaptionText(text = '') {
  return String(text || '')
    .replace(/<break\s+time=["'][^"']+["']\s*\/?\s*>/gis, '')
    .replace(/^\s*\/>\s*/gm, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\{\\[^}]+\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseSrtTimestamp(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2}):(\d{2})(?:[,.](\d{1,3}))?$/);
  if (!match) return null;
  const [, hours, minutes, seconds, millis = '0'] = match;
  const ms = Number.parseInt(millis.padEnd(3, '0').slice(0, 3), 10);
  const total = (Number.parseInt(hours, 10) * 3600) + (Number.parseInt(minutes, 10) * 60) + Number.parseInt(seconds, 10) + (ms / 1000);
  return Number.isFinite(total) ? total : null;
}

export function parseSrtCaptions(srtText = '') {
  const normalized = String(srtText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) return [];

  return normalized.split(/\n{2,}/).reduce((captions, block, index) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return captions;

    let cueLines = lines;
    let id = String(index + 1);
    if (/^\d+$/.test(lines[0])) {
      id = lines[0];
      cueLines = lines.slice(1);
    }

    const timingIndex = cueLines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0) return captions;

    const [rawStart, rawEnd] = cueLines[timingIndex].split('-->').map((part) => part.trim().split(/\s+/)[0]);
    const start = parseSrtTimestamp(rawStart);
    const end = parseSrtTimestamp(rawEnd);
    if (start == null || end == null || end <= start) return captions;

    const text = cleanCaptionText(cueLines.slice(timingIndex + 1).join(' '));
    if (!text) return captions;

    captions.push({
      id,
      start,
      end,
      text,
      words: text.split(/\s+/).filter(Boolean)
    });
    return captions;
  }, []);
}

export function getActiveCaption(captions = [], currentTime = 0) {
  if (!Array.isArray(captions) || !captions.length) return null;
  const time = Number(currentTime) || 0;
  return captions.find((caption) => time >= caption.start && time <= caption.end) || null;
}

export function getApproximateActiveWord(caption, currentTime = 0) {
  if (!caption || !Array.isArray(caption.words) || !caption.words.length) return null;
  const duration = Number(caption.end) - Number(caption.start);
  if (!Number.isFinite(duration) || duration <= 0) return null;
  const elapsed = clamp((Number(currentTime) || 0) - Number(caption.start), 0, duration);
  const wordDuration = duration / caption.words.length;
  const index = clamp(Math.floor(elapsed / wordDuration), 0, caption.words.length - 1);
  return { index, word: caption.words[index], start: caption.start + (index * wordDuration), end: caption.start + ((index + 1) * wordDuration) };
}
