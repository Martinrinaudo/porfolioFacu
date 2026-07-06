import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function UploadPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  async function logout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Subir foto</h1>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cerrar sesión ({user?.email})
            </button>
          </form>
        </div>
        <p className="text-zinc-400">
          La integración con Cloudinary va acá. Próximo paso.
        </p>
      </div>
    </div>
  )
}
