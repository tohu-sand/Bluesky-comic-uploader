import type { OAuthSession } from '@modules/types';
import type { DPoPKeyPair } from './dpop';
import type { OAuthConfig } from './oauth';
import type { AppPasswordSession } from './appPassword';
import type { AuthContext } from './context';
import { refreshAccessToken } from './oauth';
import { refreshAppPasswordSession } from './appPassword';

const REFRESH_THRESHOLD_MS = 2 * 60_000;

export interface EnsureFreshAuthContextParams {
  session: OAuthSession | null;
  dpopKeyPair: DPoPKeyPair | null;
  oauthConfig: OAuthConfig | null;
  appPasswordSession: AppPasswordSession | null;
}

export interface EnsureFreshAuthContextResult {
  context: AuthContext | null;
  refreshed: boolean;
  session?: OAuthSession;
  appPasswordSession?: AppPasswordSession;
}

export async function ensureFreshAuthContext(
  params: EnsureFreshAuthContextParams
): Promise<EnsureFreshAuthContextResult> {
  const { session, dpopKeyPair, oauthConfig, appPasswordSession } = params;

  if (session && dpopKeyPair) {
    const shouldRefresh = session.expiresAt <= Date.now() + REFRESH_THRESHOLD_MS;
    if (shouldRefresh) {
      if (!oauthConfig) {
        throw new Error('OAuth configuration is missing. Cannot refresh session.');
      }
      const nextSession = await refreshAccessToken(oauthConfig, session, dpopKeyPair);
      return {
        context: { type: 'oauth', session: nextSession, dpopKeyPair },
        refreshed: true,
        session: nextSession
      };
    }
    return {
      context: { type: 'oauth', session, dpopKeyPair },
      refreshed: false
    };
  }

  if (appPasswordSession) {
    const expiresAt = getJwtExpiration(appPasswordSession.accessJwt);
    const shouldRefresh = expiresAt !== null
      ? expiresAt <= Date.now() + REFRESH_THRESHOLD_MS
      : Boolean(appPasswordSession.refreshJwt);

    if (shouldRefresh && appPasswordSession.refreshJwt) {
      const nextSession = await refreshAppPasswordSession(appPasswordSession);
      return {
        context: {
          type: 'app-password',
          service: nextSession.service,
          did: nextSession.did,
          accessJwt: nextSession.accessJwt,
          refreshJwt: nextSession.refreshJwt
        },
        refreshed: true,
        appPasswordSession: nextSession
      };
    }

    return {
      context: {
        type: 'app-password',
        service: appPasswordSession.service,
        did: appPasswordSession.did,
        accessJwt: appPasswordSession.accessJwt,
        refreshJwt: appPasswordSession.refreshJwt
      },
      refreshed: false
    };
  }

  return {
    context: null,
    refreshed: false
  };
}

function getJwtExpiration(token: string): number | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as { exp?: number };
    if (typeof payload.exp === 'number') {
      return payload.exp * 1000;
    }
  } catch (error) {
    console.warn('Failed to parse JWT payload for expiration', error);
  }
  return null;
}

function base64UrlDecode(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return atob(padded);
}
