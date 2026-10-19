import type { Paper } from '../../types'

export const PAPERS: (Paper & { group: 'Document' | 'Photo'; dimensions: string })[] = [
  { id: 'a4', label: 'A4', widthMm: 210, heightMm: 297, group: 'Document', dimensions: '210 × 297 mm' },
  { id: 'letter', label: 'Letter', widthMm: 215.9, heightMm: 279.4, group: 'Document', dimensions: '8.5 × 11 in' },
  { id: 'legal', label: 'Legal', widthMm: 215.9, heightMm: 355.6, group: 'Document', dimensions: '8.5 × 14 in' },
  { id: 'a5', label: 'A5', widthMm: 148, heightMm: 210, group: 'Document', dimensions: '148 × 210 mm' },
  { id: 'a6', label: 'A6', widthMm: 105, heightMm: 148, group: 'Document', dimensions: '105 × 148 mm' },
  { id: '3r', label: '3R', widthMm: 88.9, heightMm: 127, group: 'Photo', dimensions: '3.5 × 5 in' },
  { id: '4r', label: '4R', widthMm: 101.6, heightMm: 152.4, group: 'Photo', dimensions: '4 × 6 in' },
  { id: '5r', label: '5R', widthMm: 127, heightMm: 177.8, group: 'Photo', dimensions: '5 × 7 in' },
  { id: '6r', label: '6R', widthMm: 152.4, heightMm: 203.2, group: 'Photo', dimensions: '6 × 8 in' },
  { id: '8x10', label: '8 × 10', widthMm: 203.2, heightMm: 254, group: 'Photo', dimensions: '8 × 10 in' },
]
