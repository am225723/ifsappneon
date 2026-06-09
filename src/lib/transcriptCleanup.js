function normalizeForCompare(value = '') {
  return String(value || '').toLowerCase().trim().replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function isAllCapsTitle(line = '') {
  const letters = line.replace(/[^A-Za-z]/g, '');
  if (letters.length < 4) return false;
  return letters === letters.toUpperCase();
}

export function cleanTranscriptText(rawText = '', title = '') {
  let text = String(rawText || '');

  text = text.replace(/<break\s+time=["'][^"']+["']\s*\/?>/gi, '');
  text = text.replace(/\*\*\s*pause\s*\d+(?:\.\d+)?\s*seconds?\s*\*\*/gi, '');
  text = text.replace(/\*\*\s*pause\s*\*\*/gi, '');
  text = text.replace(/\[\s*pause\s*\d+(?:\.\d+)?\s*seconds?\s*\]/gi, '');
  text = text.replace(/\[\s*pause\s*\]/gi, '');
  text = text.replace(/\bpause\s*\d+(?:\.\d+)?\s*seconds?\b/gi, '');
  text = text.replace(/^\s*pause\s*$/gim, '');
  text = text.replace(/^Filename:.*$/gim, '');
  text = text.replace(/^Duration:.*$/gim, '');
  text = text.replace(/^Type:.*$/gim, '');
  text = text.replace(/^Source script document:.*$/gim, '');

  const lines = text.split(/\r?\n/).map((line) => line.trim());
  while (lines.length && !lines[0]) lines.shift();

  if (lines.length) {
    const first = lines[0].trim();
    const normalizedFirst = normalizeForCompare(first);
    const normalizedTitle = normalizeForCompare(title);
    const welcomeLine = normalizedFirst.startsWith('welcome to') || normalizedFirst.startsWith('welcome back');
    const filenameLike = /\.(txt|md|srt|mp3|wav)$/i.test(first) || /^\d{1,2}[_-]/.test(first);
    const titleLike = normalizedTitle && normalizedFirst === normalizedTitle;

    if (!welcomeLine && (titleLike || filenameLike || isAllCapsTitle(first))) {
      lines.shift();
    }
  }

  text = lines.join('\n');
  text = text.replace(/[ \t]+\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}
