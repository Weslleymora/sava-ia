'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Scale, UserPlus } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    })

    if (signUpError) {
      setError(signUpError.message ?? 'Erro ao criar conta.')
      setLoading(false)
      return
    }

    // Se o usuário foi criado e confirmado automaticamente, criar perfil
    if (data.user && data.session) {
      await supabase
        .from('profiles')
        .upsert({ id: data.user.id, name, role: 'user', active: true })

      router.push('/dashboard')
      router.refresh()
      return
    }

    // Se precisa confirmar e-mail
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 mb-4">
              <Scale className="w-8 h-8 text-violet-400" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">SAVA IA</h1>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 border border-green-500/30 mb-4">
              <UserPlus className="w-6 h-6 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Conta criada!</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Enviamos um link de confirmação para <strong className="text-white">{email}</strong>. Verifique sua caixa de entrada e clique no link para ativar sua conta.
            </p>
            <Button
              onClick={() => router.push('/login')}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-5 rounded-xl transition-all"
            >
              Ir para o login
            </Button>
          </div>

          <p className="text-center text-zinc-600 text-xs mt-6">
            SAVA — Sebadelhe Aranha & Vasconcelos
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 mb-4">
            <Scale className="w-8 h-8 text-violet-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">SAVA IA</h1>
          <p className="text-zinc-400 mt-2 text-sm">Sistema de Análise de Processos</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="w-5 h-5 text-violet-400" />
            <h2 className="text-xl font-semibold text-white">Criar conta</h2>
          </div>
          <p className="text-zinc-500 text-sm mb-6">
            Preencha os dados abaixo para criar sua conta.
          </p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Nome completo</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Confirmar senha</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                required
                minLength={8}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-5 rounded-xl transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar conta'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-4">
          Já tem uma conta?{' '}
          <a href="/login" className="text-violet-500 hover:text-violet-400 underline underline-offset-2">
            Entrar
          </a>
        </p>

        <p className="text-center text-zinc-600 text-xs mt-2">
          SAVA — Sebadelhe Aranha & Vasconcelos
        </p>
      </div>
    </div>
  )
}
