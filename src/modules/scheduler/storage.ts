import { get, set } from 'idb-keyval';
import type { SchedulerEntry } from '@modules/types';

const STORE_KEY = 'scheduler_entries_v1';

export async function listSchedulerEntries(): Promise<SchedulerEntry[]> {
  const stored = await get<SchedulerEntry[] | undefined>(STORE_KEY);
  if (!stored) {
    return [];
  }
  return stored.map((entry) => ({ ...entry }));
}

export async function putSchedulerEntry(entry: SchedulerEntry): Promise<void> {
  const entries = await listSchedulerEntries();
  const index = entries.findIndex((item) => item.id === entry.id);
  if (index >= 0) {
    entries[index] = entry;
  } else {
    entries.push(entry);
  }
  await set(STORE_KEY, entries);
}

export async function deleteSchedulerEntry(id: string): Promise<void> {
  const entries = await listSchedulerEntries();
  const filtered = entries.filter((entry) => entry.id !== id);
  await set(STORE_KEY, filtered);
}

export async function clearSchedulerEntries(): Promise<void> {
  await set(STORE_KEY, []);
}
