import type { AuthorizationPreparation, OAuthConfig } from './oauth';
import { exportDpopKeyPair, importDpopKeyPair, type DPoPKeyPair, type SerializedDpopKeyPair } from './dpop';

const PENDING_KEY = 'oauth_pending_flow';

interface StoredPendingAuth {
  codeVerifier: string;
  state: string;
  config: OAuthConfig;
  dpop: SerializedDpopKeyPair;
}

export async function storePendingAuthorization(prep: AuthorizationPreparation, config: OAuthConfig) {
  const serialized = await exportDpopKeyPair(prep.dpopKeyPair);
  const payload: StoredPendingAuth = {
    codeVerifier: prep.codeVerifier,
    state: prep.state,
    config,
    dpop: serialized
  };
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload));
}

export async function restorePendingAuthorization(): Promise<{
  codeVerifier: string;
  state: string;
  config: OAuthConfig;
  dpopKeyPair: DPoPKeyPair;
} | null> {
  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as StoredPendingAuth;
    const dpopKeyPair = await importDpopKeyPair(parsed.dpop);
    return {
      codeVerifier: parsed.codeVerifier,
      state: parsed.state,
      config: parsed.config,
      dpopKeyPair
    };
  } catch (error) {
    console.warn('Failed to restore pending authorization', error);
    return null;
  }
}

export function clearPendingAuthorization() {
  sessionStorage.removeItem(PENDING_KEY);
}
