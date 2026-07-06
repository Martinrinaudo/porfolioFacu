export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024
export const MAX_BATCH_SIZE = 6

export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'Formato no permitido (solo JPG, PNG, WEBP, HEIC/HEIF)'
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `Supera el tamaño máximo (${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB)`
  }
  return null
}

export function deriveTitleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^./]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
}
