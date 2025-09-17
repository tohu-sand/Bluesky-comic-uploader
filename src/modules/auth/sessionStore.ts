import { get, set, del } from 'idb-keyval';
import type { OAuthSession } from '@modules/types';
import type { DPoPKeyPair, SerializedDpopKeyPair } from './dpop';
import { exportDpopKeyPair, importDpopKeyPair } from './dpop';

const SESSION_KEY = 'oauth_session_v1';
const SESSION_AES_KEY = 'oauth_session_aes_key';

let memorySession: OAuthSession | null = null;
let memoryDpopKeyPair: DPoPKeyPair | null = null;

interface PersistedPayload {
  session: OAuthSession;
  dpop: SerializedDpopKeyPair;
}

export function getMemorySession() {
  return { session: memorySession, dpopKeyPair: memoryDpopKeyPair } as const;
}

export function setMemorySession(session: OAuthSession | null, dpopKeyPair: DPoPKeyPair | null) {
  memorySession = session;
  memoryDpopKeyPair = dpopKeyPair;
}

export async function persistSession(session: OAuthSession, dpopKeyPair: DPoPKeyPair) {
  const key = await getOrCreateAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload: PersistedPayload = {
    session,
    dpop: await exportDpopKeyPair(dpopKeyPair)
  };
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  await set(SESSION_KEY, {
    iv: Array.from(iv),
    data: arrayBufferToBase64(encrypted),
    storedAt: Date.now()
  });
}

export async function loadPersistedSession(): Promise<{ session: OAuthSession; dpopKeyPair: DPoPKeyPair } | null> {
  const rawKey = sessionStorage.getItem(SESSION_AES_KEY);
  if (!rawKey) {
    return null;
  }
  const stored = await get<{ iv: number[]; data: string } | undefined>(SESSION_KEY);
  if (!stored) {
    return null;
  }
  try {
    const key = await importAesKey(base64ToArrayBuffer(rawKey));
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(stored.iv)
      },
      key,
      base64ToArrayBuffer(stored.data)
    );
    const json = new TextDecoder().decode(new Uint8Array(decrypted));
    const parsed = JSON.parse(json) as PersistedPayload;
    const dpopKeyPair = await importDpopKeyPair(parsed.dpop);
    memorySession = parsed.session;
    memoryDpopKeyPair = dpopKeyPair;
    return { session: parsed.session, dpopKeyPair };
  } catch (error) {
    console.warn('Failed to load persisted session', error);
    await clearPersistedSession();
    return null;
  }
}

export async function clearPersistedSession() {
  await del(SESSION_KEY);
  sessionStorage.removeItem(SESSION_AES_KEY);
  memorySession = null;
  memoryDpopKeyPair = null;
}

async function getOrCreateAesKey(): Promise<CryptoKey> {
  const existing = sessionStorage.getItem(SESSION_AES_KEY);
  if (existing) {
    return importAesKey(base64ToArrayBuffer(existing));
  }
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const raw = await crypto.subtle.exportKey('raw', key);
  sessionStorage.setItem(SESSION_AES_KEY, arrayBufferToBase64(raw));
  return key;
}

async function importAesKey(buffer: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', buffer, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
