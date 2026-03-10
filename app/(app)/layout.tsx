import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Sidebar from '@/components/Sidebar'
import { Toaster } from '@/components/ui/sonner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <Sidebar
        userName={profile?.name ?? user.email ?? 'Usuário'}
        userRole={profile?.role ?? 'advogado'}
        userEmail={user.email ?? ''}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <Toaster richColors theme="dark" />
    </div>
  )
}
