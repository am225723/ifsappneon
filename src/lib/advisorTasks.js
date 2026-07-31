import { getClerkBearerToken, missingAuthResponse } from './apiAuth';

const TASKS_API_PATH = '/api/tasks';

async function tasksRequest(payload) {
  const token = await getClerkBearerToken();
  if (!token) {
    return missingAuthResponse('Unable to reach your secure session yet. Please wait a moment and try again.');
  }

  let response;
  try {
    response = await fetch(TASKS_API_PATH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    return { data: null, error: { message: error.message || 'Network request failed', status: 0 } };
  }

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof json.error === 'string'
      ? json.error
      : json.error?.message || response.statusText || 'Task request failed';
    return { data: null, error: { message, status: response.status } };
  }
  return { data: json.data, error: null };
}

export function loadAdvisorTasks({ filter = 'open', limit = 100 } = {}) {
  return tasksRequest({ action: 'list', filter, limit });
}

export function createAdvisorTask({ title, clientId, category, priority, dueDate }) {
  return tasksRequest({ action: 'create', title, clientId, category, priority, dueDate });
}

export function toggleAdvisorTask(taskId) {
  return tasksRequest({ action: 'toggle', taskId });
}

export function archiveAdvisorTask(taskId) {
  return tasksRequest({ action: 'archive', taskId });
}
