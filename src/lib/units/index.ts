export const MM_PER_INCH = 25.4
export const DEFAULT_DPI = 300
export const inToMm = (value: number) => value * MM_PER_INCH
export const mmToIn = (value: number) => value / MM_PER_INCH
export const mmToPx = (mm: number, dpi = DEFAULT_DPI) => Math.round((mm / MM_PER_INCH) * dpi)
export const pxToMm = (px: number, dpi = DEFAULT_DPI) => (px / dpi) * MM_PER_INCH
