'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  PlusCircle,
  Scale,
  LogOut,
  ShieldCheck,
  User,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface SidebarProps {
  userName: string
  userRole: string
  userEmail: string
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/analise/nova', label: 'Nova Análise', icon: PlusCircle },
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  advogado: 'Advogado',
  estagiario: 'Estagiário',
}

export default function Sidebar({ userName, userRole, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <Scale className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">SAVA IA</p>
            <p className="text-zinc-500 text-xs">Análise de Processos</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}

        {userRole === 'admin' && (
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              pathname === '/admin'
                ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            Administração
          </Link>
        )}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-zinc-800">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors text-left">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-violet-600/30 text-violet-300 text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{userName}</p>
              <p className="text-zinc-500 text-xs">{ROLE_LABELS[userRole] ?? userRole}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52 bg-zinc-900 border-zinc-800">
            <DropdownMenuItem className="text-zinc-400 text-xs cursor-default" disabled>
              <User className="w-3 h-3 mr-2" />
              {userEmail}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
