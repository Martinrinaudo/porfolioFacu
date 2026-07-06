'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { uploadPhotoToCloudinary } from '@/lib/cloudinary/upload'
import { validateImageFile, deriveTitleFromFilename } from '@/lib/cloudinary/validation'
import type { PhotoInsert } from '@/types/database'

export type UploadPhotosState = {
  success: boolean
  insertedCount: number
  failed: { filename: string; reason: string }[]
  message: string
}

const initialFailed: UploadPhotosState['failed'] = []

export async function uploadPhotos(
  _prevState: UploadPhotosState,
  formData: FormData
): Promise<UploadPhotosState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, insertedCount: 0, failed: initialFailed, message: 'No autenticado.' }
  }

  const categoryId = formData.get('categoryId') as string | null
  const files = formData.getAll('files') as File[]

  if (!categoryId) {
    return { success: false, insertedCount: 0, failed: initialFailed, message: 'Falta seleccionar una categoría.' }
  }
  if (files.length === 0) {
    return { success: false, insertedCount: 0, failed: initialFailed, message: 'No se seleccionó ningún archivo.' }
  }

  const failed: { filename: string; reason: string }[] = []
  const validFiles: { file: File; title: string }[] = []

  files.forEach((file, i) => {
    const error = validateImageFile(file)
    if (error) {
      failed.push({ filename: file.name, reason: error })
      return
    }
    const title = (formData.get(`title-${i}`) as string | null)?.trim() || deriveTitleFromFilename(file.name)
    validFiles.push({ file, title })
  })

  const results = await Promise.allSettled(
    validFiles.map(async ({ file, title }) => {
      const buffer = Buffer.from(await file.arrayBuffer())
      const { secure_url, public_id } = await uploadPhotoToCloudinary(buffer)
      return { file, title, secure_url, public_id }
    })
  )

  const rows: PhotoInsert[] = []
  results.forEach((result, i) => {
    const { file } = validFiles[i]
    if (result.status === 'fulfilled') {
      rows.push({
        title: result.value.title,
        description: null,
        cloudinary_url: result.value.secure_url,
        cloudinary_public_id: result.value.public_id,
        category_id: categoryId,
        taken_at: null,
      })
    } else {
      failed.push({ filename: file.name, reason: 'Error al subir a Cloudinary' })
    }
  })

  let insertedCount = 0
  if (rows.length > 0) {
    const { data, error } = await supabase.from('photos').insert(rows).select()
    if (error) {
      return {
        success: false,
        insertedCount: 0,
        failed: [...failed, ...rows.map((r) => ({ filename: r.title, reason: 'Error al guardar en la base de datos' }))],
        message: 'Las fotos se subieron a Cloudinary pero no se pudieron guardar en la base de datos.',
      }
    }
    insertedCount = data?.length ?? 0
    revalidatePath('/admin/upload')
  }

  return {
    success: insertedCount > 0,
    insertedCount,
    failed,
    message:
      insertedCount > 0
        ? `Se subieron ${insertedCount} foto(s) correctamente.${failed.length > 0 ? ` ${failed.length} fallaron.` : ''}`
        : 'No se pudo subir ninguna foto.',
  }
}
