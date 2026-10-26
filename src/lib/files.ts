import { supabase } from './supabase'

// Shrinks a photo in the browser (max 1280px, JPEG) so uploads stay small.
export async function shrinkImage(file: File, max = 1280, quality = 0.7): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', quality))
}

// Photos for posts, listings and the UPI QR go in the public "media" bucket, in the uploader's folder.
export async function uploadPhoto(file: File): Promise<string> {
  const { data } = await supabase.auth.getUser()
  const path = `${data.user!.id}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage
    .from('media')
    .upload(path, await shrinkImage(file), { contentType: 'image/jpeg' })
  if (error) throw new Error(error.message)
  return path
}

export function photoUrl(path: string) {
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}

export async function deletePhoto(path: string | null) {
  if (path) await supabase.storage.from('media').remove([path])
}

export type PrivateBucket = 'documents' | 'receipts'

// Documents and receipts live in private buckets.
export async function uploadPrivate(bucket: PrivateBucket, file: File): Promise<string> {
  const isImage = file.type.startsWith('image/')
  const body = isImage ? await shrinkImage(file) : file
  const name = isImage ? 'photo.jpg' : file.name.replace(/[^\w.-]+/g, '_')
  const path = `${crypto.randomUUID()}-${name}`
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { contentType: isImage ? 'image/jpeg' : file.type || undefined })
  if (error) throw new Error(error.message)
  return path
}

// Opens a private file using a short-lived link. The tab is opened before the
// network call so the browser doesn't block it as a pop-up.
export async function openPrivate(bucket: PrivateBucket, path: string) {
  const tab = window.open('', '_blank')
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300)
  if (error || !data) {
    tab?.close()
    alert(error?.message ?? 'Could not open the file')
    return
  }
  if (tab) tab.location.href = data.signedUrl
  else window.location.href = data.signedUrl
}

export async function deletePrivate(bucket: PrivateBucket, path: string | null) {
  if (path) await supabase.storage.from(bucket).remove([path])
}
