import { openDB } from 'idb'
import type { StoredDraft } from '../../types'
const db = () => openDB('idready', 1, { upgrade(database) { database.createObjectStore('drafts', { keyPath: 'id' }) } })
export async function saveDraft(draft: StoredDraft) { return (await db()).put('drafts', draft) }
export async function getDraft(): Promise<StoredDraft | undefined> { return (await db()).get('drafts', 'current') }
export async function deleteDraft() { return (await db()).delete('drafts', 'current') }
export async function clearLocalData() { (await db()).close(); return indexedDB.deleteDatabase('idready') }
