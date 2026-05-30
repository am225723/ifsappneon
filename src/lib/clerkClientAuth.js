export function persistClientSession(client) {
  if (!client) return;
  localStorage.setItem('client_id', client.id);
  localStorage.setItem('client_name', client.name || '');
  localStorage.setItem('client_user_role', client.user_role || 'client');
  localStorage.removeItem('client_pin');

  if (client.access_restrictions) {
    localStorage.setItem('client_access_restrictions', JSON.stringify(client.access_restrictions));
  } else {
    localStorage.removeItem('client_access_restrictions');
  }
}

export function clearClientSession() {
  localStorage.removeItem('client_id');
  localStorage.removeItem('client_pin');
  localStorage.removeItem('client_name');
  localStorage.removeItem('client_user_role');
  localStorage.removeItem('client_access_restrictions');
}

export async function fetchLinkedClient(getToken) {
  const token = await getToken();
  const response = await fetch('/api/me', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json.error || 'Unable to load client profile.');
  }

  return json.client || null;
}

export async function claimClientWithPin(getToken, pin) {
  const token = await getToken();
  const response = await fetch('/api/claim-client', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ pin })
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json.error || 'Unable to claim client profile.');
  }

  return json.client;
}
