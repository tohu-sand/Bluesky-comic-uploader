import { generateCodeVerifier, deriveCodeChallenge, generateState } from './pkce';
import { createDpopProof, generateDpopKeyPair, computeAccessTokenHash, type DPoPKeyPair } from './dpop';
import type { OAuthSession } from '../types';

export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
  pdsUrl: string;
}

export interface AuthorizationPreparation {
  authorizeUrl: string;
  codeVerifier: string;
  state: string;
  dpopKeyPair: DPoPKeyPair;
}

export async function prepareAuthorization(config: OAuthConfig): Promise<AuthorizationPreparation> {
  const codeVerifier = await generateCodeVerifier();
  const codeChallenge = await deriveCodeChallenge(codeVerifier);
  const state = await generateState();
  const dpopKeyPair = await generateDpopKeyPair();

  const authUrl = new URL('/oauth/authorize', config.pdsUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', config.redirectUri);
  authUrl.searchParams.set('scope', config.scope);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('nonce', crypto.randomUUID());

  return {
    authorizeUrl: authUrl.toString(),
    codeVerifier,
    state,
    dpopKeyPair
  };
}

export async function exchangeAuthorizationCode(
  config: OAuthConfig,
  params: {
    code: string;
    codeVerifier: string;
    dpopKeyPair: DPoPKeyPair;
  }
): Promise<OAuthSession> {
  const tokenEndpoint = new URL('/oauth/token', config.pdsUrl);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    code: params.code,
    redirect_uri: config.redirectUri,
    code_verifier: params.codeVerifier
  });

  const proof = await createDpopProof(params.dpopKeyPair, {
    htm: 'POST',
    htu: tokenEndpoint.toString()
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      DPoP: proof
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${text}`);
  }

  const result = await response.json() as {
    access_token: string;
    refresh_token?: string;
    active: string;
    expires_in?: number;
    token_type: string;
  };

  const expiresAt = result.expires_in
    ? Date.now() + result.expires_in * 1000
    : Date.now() + 3600 * 1000;

  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    activeDid: result.active,
    expiresAt,
    pdsUrl: config.pdsUrl
  } satisfies OAuthSession;
}

export async function refreshAccessToken(
  config: OAuthConfig,
  session: OAuthSession,
  dpopKeyPair: DPoPKeyPair
): Promise<OAuthSession> {
  if (!session.refreshToken) {
    throw new Error('No refresh token available');
  }
  const tokenEndpoint = new URL('/oauth/token', config.pdsUrl);
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.clientId,
    refresh_token: session.refreshToken
  });

  const proof = await createDpopProof(dpopKeyPair, {
    htm: 'POST',
    htu: tokenEndpoint.toString()
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      DPoP: proof
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Refresh failed: ${response.status} ${text}`);
  }

  const result = await response.json() as {
    access_token: string;
    refresh_token?: string;
    active: string;
    expires_in?: number;
    token_type: string;
  };

  const expiresAt = result.expires_in
    ? Date.now() + result.expires_in * 1000
    : Date.now() + 3600 * 1000;

  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token ?? session.refreshToken,
    activeDid: result.active,
    expiresAt,
    pdsUrl: config.pdsUrl
  } satisfies OAuthSession;
}

export async function buildDpopAuthHeader(
  accessToken: string,
  endpoint: string,
  method: string,
  keyPair: DPoPKeyPair
): Promise<{ Authorization: string; DPoP: string }> {
  const ath = await computeAccessTokenHash(accessToken);
  const proof = await createDpopProof(keyPair, {
    htm: method,
    htu: endpoint,
    ath
  });

  return {
    Authorization: `DPoP ${accessToken}`,
    DPoP: proof
  };
}
