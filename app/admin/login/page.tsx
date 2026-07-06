import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await props.searchParams

  async function login(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    })
    if (error) redirect('/admin/login?error=credenciales-invalidas')
    redirect('/admin/upload')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm space-y-6 p-8 bg-zinc-900 rounded-2xl">
        <h1 className="text-xl font-semibold text-zinc-50 text-center">
          Admin
        </h1>
        {error && (
          <p className="text-sm text-red-400 text-center">
            Credenciales incorrectas. Intentá de nuevo.
          </p>
        )}
        <form action={login} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm text-zinc-400">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-50 text-sm outline-none focus:border-zinc-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm text-zinc-400">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-50 text-sm outline-none focus:border-zinc-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-zinc-50 text-zinc-950 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}
