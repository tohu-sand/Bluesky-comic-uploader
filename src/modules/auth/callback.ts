import type { OAuthSession } from '@modules/types';
import type { OAuthConfig } from './oauth';
import { clearPendingAuthorization, restorePendingAuthorization } from './pending';
import { exchangeAuthorizationCode } from './oauth';
import type { DPoPKeyPair } from './dpop';

export interface CallbackResult {
  session: OAuthSession;
  config: OAuthConfig;
  dpopKeyPair: DPoPKeyPair;
}

export async function handleAuthorizationCallback(currentUrl: URL): Promise<CallbackResult | null> {
  const error = currentUrl.searchParams.get('error');
  if (error) {
    const description = currentUrl.searchParams.get('error_description');
    throw new Error(`OAuth error: ${error}${description ? ` - ${description}` : ''}`);
  }
  const code = currentUrl.searchParams.get('code');
  const state = currentUrl.searchParams.get('state');
  if (!code || !state) {
    return null;
  }
  const pending = await restorePendingAuthorization();
  if (!pending) {
    throw new Error('Missing pending authorization context');
  }
  if (pending.state !== state) {
    throw new Error('State mismatch in OAuth response');
  }
  const session = await exchangeAuthorizationCode(pending.config, {
    code,
    codeVerifier: pending.codeVerifier,
    dpopKeyPair: pending.dpopKeyPair
  });
  clearPendingAuthorization();
  return { session, config: pending.config, dpopKeyPair: pending.dpopKeyPair };
}
