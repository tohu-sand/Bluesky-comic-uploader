interface CreateSessionResponse {
  accessJwt: string;
  refreshJwt?: string;
  did: string;
  handle: string;
}

export interface AppPasswordSession extends CreateSessionResponse {
  service: string;
}

export async function loginWithAppPassword(params: { identifier: string; password: string; service: string }): Promise<AppPasswordSession> {
  const endpoint = new URL('/xrpc/com.atproto.server.createSession', params.service);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      identifier: params.identifier,
      password: params.password
    })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Login failed: ${response.status} ${text}`);
  }
  const result = await response.json() as CreateSessionResponse;
  return {
    ...result,
    service: params.service
  };
}

export async function refreshAppPasswordSession(session: AppPasswordSession): Promise<AppPasswordSession> {
  if (!session.refreshJwt) {
    throw new Error('No refresh token available');
  }
  const endpoint = new URL('/xrpc/com.atproto.server.refreshSession', session.service);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.refreshJwt}`
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Refresh failed: ${response.status} ${text}`);
  }
  const result = await response.json() as CreateSessionResponse;
  return {
    ...result,
    service: session.service
  };
}
