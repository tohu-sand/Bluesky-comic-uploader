import type { OAuthSession } from '@modules/types';
import type { DPoPKeyPair } from './dpop';
import { buildDpopAuthHeader } from './oauth';

export type AuthContext =
  | {
      type: 'oauth';
      session: OAuthSession;
      dpopKeyPair: DPoPKeyPair;
    }
  | {
      type: 'app-password';
      service: string;
      did: string;
      accessJwt: string;
      refreshJwt?: string;
    };

export function getServiceBaseUrl(context: AuthContext): string {
  if (context.type === 'oauth') {
    return context.session.pdsUrl;
  }
  return context.service;
}

export async function buildAuthHeaders(
  context: AuthContext,
  endpoint: string,
  method: string
): Promise<Record<string, string>> {
  if (context.type === 'oauth') {
    return buildDpopAuthHeader(context.session.accessToken, endpoint, method, context.dpopKeyPair);
  }
  return {
    Authorization: `Bearer ${context.accessJwt}`
  };
}
