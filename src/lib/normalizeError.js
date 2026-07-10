export function normalizeError(error, fallback = 'Request failed') {
  if (!error) return null;
  return typeof error === 'string' ? { message: error } : error.message ? error : { message: fallback };
}
