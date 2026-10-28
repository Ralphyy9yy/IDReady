export type Stage = 'add' | 'edit' | 'export'
export type Unit = 'mm' | 'in'
export type BorderStyle = 'none' | 'thin-gray' | 'thin-black' | 'medium-black' | 'double-black' | 'white-inset'
export interface PhotoSize { id: string; label: string; widthMm: number; heightMm: number }
export interface NameTag { enabled: boolean; name: string; secondLine: string; fontSize: number; alignment: 'left' | 'center' | 'right' }
export interface Transform { x: number; y: number; zoom: number; rotation: number; brightness: number; contrast: number; borderStyle: BorderStyle; nameTag?: NameTag }
export interface Paper { id: 'a4' | 'a5' | 'a6' | 'letter' | 'legal' | '3r' | '4r' | '5r' | '6r' | '8x10'; label: string; widthMm: number; heightMm: number }
export interface SheetSettings { paper: Paper; orientation: 'portrait' | 'landscape'; quantity: number; marginMm: number; gapMm: number; cuttingGuides: boolean }
export interface LayoutItem { x: number; y: number; width: number; height: number; page: number }
export interface SheetLayout { items: LayoutItem[]; perPage: number; pages: number; pageWidth: number; pageHeight: number; cols: number; rows: number }
export interface AsaPortrait { photo:Blob; transform:Transform }
export type AsaPair = (AsaPortrait|undefined)[]
export interface StoredDraft { id: string; createdAt: number; updatedAt?: number; name?: string; thumbnail?: Blob; photo: Blob; size: PhotoSize; transform: Transform; processed?: Blob; sheetSettings?:SheetSettings; asaPair?:AsaPair; stage?:'edit'|'export' }
