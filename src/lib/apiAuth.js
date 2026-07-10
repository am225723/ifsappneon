const TOKEN_WAIT_TIMEOUT_MS = 2500;
const TOKEN_WAIT_INTERVAL_MS = 100;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function localAuthError(message = 'Sign in is still loading. Please try again in a moment.') {
  return {
    data: null,
    error: {
      message,
      status: 401,
      local: true
    }
  };
}

export async function getClerkBearerToken({ waitMs = TOKEN_WAIT_TIMEOUT_MS } = {}) {
  if (typeof window === 'undefined') return null;
  if (window.navigator && window.navigator.onLine === false) return null;

  const startedAt = Date.now();
  while (Date.now() - startedAt <= waitMs) {
    try {
      const clerk = window.Clerk;
      if (clerk?.session?.getToken) {
        const token = await clerk.session.getToken();
        if (token) return token;
      }
      if (clerk?.loaded && !clerk?.session) return null;
    } catch (error) {
      console.warn('Unable to read Clerk token:', error);
      return null;
    }
    await sleep(TOKEN_WAIT_INTERVAL_MS);
  }

  return null;
}

export async function getClerkToken() {
  try {
    const clerk = typeof window !== 'undefined' ? window.Clerk : null;
    if (clerk?.session?.getToken) return await clerk.session.getToken();
  } catch (error) {
    console.warn('Unable to read Clerk token:', error);
  }
  return null;
}

export function missingAuthResponse(message) {
  if (typeof window !== 'undefined' && window.navigator?.onLine === false) {
    return localAuthError('You appear to be offline. Your changes can be retried once the connection returns.');
  }
  return localAuthError(message);
}
