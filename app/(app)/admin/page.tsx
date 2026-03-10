'use client'

import { useEffect, useState } from 'react'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { UserPlus, Loader2, ShieldCheck, Users } from 'lucide-react'

interface UserProfile {
  id: string
  name: string
  role: string
  active: boolean
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  advogado: 'Advogado',
  estagiario: 'Estagiário',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  advogado: 'bg-blue-500/15 text-blue-400 border-blue-400/30',
  estagiario: 'bg-zinc-700/50 text-zinc-400 border-zinc-600',
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)

  // Novo usuário
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('advogado')

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoadingUsers(true)
    try {
      const res = await fetch('/api/admin/users')
      if (res.status === 403) {
        redirect('/dashboard')
        return
      }
      const data = await res.json()
      setUsers(data)
    } catch {
      toast.error('Erro ao carregar usuários.')
    } finally {
      setLoadingUsers(false)
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          name: newName,
          password: newPassword,
          role: newRole,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success('Usuário criado com sucesso!')
      setShowForm(false)
      setNewName('')
      setNewEmail('')
      setNewPassword('')
      setNewRole('advogado')
      fetchUsers()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Erro ao criar usuário.')
    } finally {
      setCreating(false)
    }
  }

  async function updateRole(userId: string, role: string) {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar')
      toast.success('Função atualizada!')
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)))
    } catch {
      toast.error('Erro ao atualizar função.')
    }
  }

  async function toggleActive(userId: string, active: boolean) {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, active }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar')
      toast.success(active ? 'Usuário ativado.' : 'Usuário desativado.')
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, active } : u)))
    } catch {
      toast.error('Erro ao atualizar usuário.')
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-white">Administração</h1>
          </div>
          <p className="text-zinc-400 text-sm">Gerencie os usuários e níveis de acesso do sistema.</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Formulário de novo usuário */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">Criar novo usuário</h2>
          <form onSubmit={createUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Nome completo</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome do usuário"
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Email</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@exemplo.com"
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Senha temporária</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Função</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="estagiario" className="text-zinc-300">Estagiário</SelectItem>
                  <SelectItem value="advogado" className="text-zinc-300">Advogado</SelectItem>
                  <SelectItem value="admin" className="text-zinc-300">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={creating}
                className="bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Usuário'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForm(false)}
                className="text-zinc-500"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de usuários */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-zinc-800">
          <Users className="w-4 h-4 text-zinc-500" />
          <span className="text-white font-semibold text-sm">{users.length} usuários</span>
        </div>

        {loadingUsers ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-6 py-4">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-zinc-300 text-xs font-bold">
                    {u.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{u.name}</p>
                  <p className="text-zinc-500 text-xs">
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Status */}
                {!u.active && (
                  <Badge variant="outline" className="text-xs border-red-500/30 text-red-400">
                    Inativo
                  </Badge>
                )}

                {/* Role selector */}
                <Select value={u.role} onValueChange={(role) => updateRole(u.id, role)}>
                  <SelectTrigger className={`w-36 text-xs border rounded-lg px-2 py-1 h-8 ${ROLE_COLORS[u.role]}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="estagiario" className="text-zinc-300 text-xs">Estagiário</SelectItem>
                    <SelectItem value="advogado" className="text-zinc-300 text-xs">Advogado</SelectItem>
                    <SelectItem value="admin" className="text-zinc-300 text-xs">Administrador</SelectItem>
                  </SelectContent>
                </Select>

                {/* Toggle active */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleActive(u.id, !u.active)}
                  className={u.active ? 'text-zinc-500 hover:text-red-400 text-xs' : 'text-zinc-500 hover:text-green-400 text-xs'}
                >
                  {u.active ? 'Desativar' : 'Ativar'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
