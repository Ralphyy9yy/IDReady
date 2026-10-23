import { openDB } from 'idb'
import type { StoredDraft } from '../../types'
const db = () => openDB('idready', 1, { upgrade(database) { database.createObjectStore('drafts', { keyPath: 'id' }) } })
export async function saveDraft(draft: StoredDraft) { return (await db()).put('drafts', draft) }
export async function getDraft(id = 'current'): Promise<StoredDraft | undefined> { return (await db()).get('drafts', id) }
export async function listDrafts(): Promise<StoredDraft[]> { return (await (await db()).getAll('drafts')).sort((a:StoredDraft,b:StoredDraft)=>(b.updatedAt??b.createdAt)-(a.updatedAt??a.createdAt)) }
export async function deleteDraft(id = 'current') { return (await db()).delete('drafts', id) }
export async function clearLocalData() { (await db()).close(); return indexedDB.deleteDatabase('idready') }
