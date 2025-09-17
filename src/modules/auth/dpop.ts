import { base64UrlEncode } from './encoding';

export interface DPoPKeyPair {
  publicKey: JsonWebKey;
  privateKey: CryptoKey;
}

export interface SerializedDpopKeyPair {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

export async function generateDpopKeyPair(): Promise<DPoPKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256'
    },
    true,
    ['sign', 'verify']
  );
  const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  return {
    publicKey,
    privateKey: keyPair.privateKey
  };
}

export async function exportDpopKeyPair(keyPair: DPoPKeyPair): Promise<SerializedDpopKeyPair> {
  const privateKey = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  return {
    publicKey: keyPair.publicKey,
    privateKey
  };
}

export async function importDpopKeyPair(serialized: SerializedDpopKeyPair): Promise<DPoPKeyPair> {
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    serialized.privateKey,
    {
      name: 'ECDSA',
      namedCurve: 'P-256'
    },
    true,
    ['sign']
  );

  return {
    publicKey: serialized.publicKey,
    privateKey
  };
}

export async function createDpopProof(
  keyPair: DPoPKeyPair,
  options: {
    htm: string;
    htu: string;
    jti?: string;
    ath?: string;
  }
): Promise<string> {
  const header = {
    typ: 'dpop+jwt',
    alg: 'ES256',
    jwk: normalizePublicJwk(keyPair.publicKey)
  };

  const payload = {
    htm: options.htm,
    htu: options.htu,
    iat: Math.floor(Date.now() / 1000),
    jti: options.jti ?? crypto.randomUUID(),
    ...(options.ath ? { ath: options.ath } : {})
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    keyPair.privateKey,
    new TextEncoder().encode(signingInput)
  );
  const encodedSignature = base64UrlEncode(signature);
  return `${signingInput}.${encodedSignature}`;
}

export async function computeAccessTokenHash(accessToken: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(accessToken));
  const bytes = new Uint8Array(digest);
  const half = bytes.slice(0, bytes.length / 2);
  return base64UrlEncode(half.buffer);
}

function normalizePublicJwk(jwk: JsonWebKey) {
  const { d: _privateKey, ...rest } = jwk;
  return rest;
}
