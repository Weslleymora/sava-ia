'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import FileUploader from '@/components/FileUploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OBJETOS_ENERGISA, ESTADOS_BRASIL } from '@/lib/prompts'
import { Loader2, Send, Scale, FileText, MessageSquare, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

const STEPS = [
  { icon: FileText,     label: 'Lendo documentos...',      pct: 15 },
  { icon: Scale,        label: 'Extraindo texto...',        pct: 30 },
  { icon: Sparkles,     label: 'Aplicando prompt jurídico...', pct: 50 },
  { icon: Loader2,      label: 'Consultando IA...',         pct: 65 },
  { icon: MessageSquare,label: 'Gerando análise...',        pct: 85 },
  { icon: Sparkles,     label: 'Finalizando ficha...',      pct: 96 },
]

export default function NovaAnalisePage() {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [objeto, setObjeto] = useState('')
  const [estado, setEstado] = useState('')
  const [comentario, setComentario] = useState('')
  const [titulo, setTitulo] = useState('')
  const [loading, setLoading] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [pct, setPct] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (files.length === 0) {
      toast.error('Adicione ao menos 1 arquivo para análise.')
      return
    }
    if (!objeto) {
      toast.error('Selecione o objeto da ação.')
      return
    }

    setLoading(true)
    setStepIdx(0)
    setPct(5)

    const fd = new FormData()
    fd.append('objeto', objeto)
    if (estado) fd.append('estado', estado)
    if (comentario.trim()) fd.append('comentario', comentario.trim())
    if (titulo.trim()) fd.append('titulo', titulo.trim())
    files.forEach((f) => fd.append('files', f))

    abortRef.current = new AbortController()

    // Avança steps automaticamente enquanto aguarda
    let currentStep = 0
    const stepTimer = setInterval(() => {
      currentStep = Math.min(currentStep + 1, STEPS.length - 1)
      setStepIdx(currentStep)
      setPct(STEPS[currentStep].pct)
    }, 3500)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: fd,
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        let errorMsg = `Erro ${res.status}`
        try {
          const err = await res.json()
          errorMsg = err.error ?? errorMsg
        } catch {
          const text = await res.text().catch(() => '')
          if (res.status === 413) errorMsg = 'Arquivos muito grandes. Reduza o tamanho total e tente novamente.'
          else if (text) errorMsg = text.slice(0, 120)
        }
        throw new Error(errorMsg)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let caseId: string | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.caseId && !caseId) caseId = data.caseId
            if (data.done && caseId) {
              clearInterval(stepTimer)
              setPct(100)
              setTimeout(() => router.push(`/analise/${caseId}`), 400)
              return
            }
          } catch { /* ignora */ }
        }
      }

      if (caseId) {
        clearInterval(stepTimer)
        setPct(100)
        setTimeout(() => router.push(`/analise/${caseId}`), 400)
      }
    } catch (err: unknown) {
      clearInterval(stepTimer)
      if (err instanceof Error && err.name === 'AbortError') return
      toast.error((err as Error).message ?? 'Erro ao processar análise.')
      setLoading(false)
      setPct(0)
    }
  }

  const currentStep = STEPS[stepIdx]

  if (loading) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center z-50">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(to right, #a78bfa 1px, transparent 1px), linear-gradient(to bottom, #a78bfa 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Glow */}
        <div className="absolute w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative text-center px-8 max-w-sm w-full">
          {/* Icon animado */}
          <div className="w-20 h-20 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-violet-500/10">
            <currentStep.icon className="w-9 h-9 text-violet-400 animate-pulse" />
          </div>

          {/* Texto */}
          <h2 className="text-xl font-bold text-white mb-2">Analisando com IA</h2>
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed">{currentStep.label}</p>

          {/* Progress bar */}
          <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-zinc-600 text-xs">{pct}%</p>

          {/* Steps indicadores */}
          <div className="flex justify-center gap-1.5 mt-6">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all duration-500 ${
                  i === stepIdx
                    ? 'w-6 bg-violet-400'
                    : i < stepIdx
                    ? 'w-2 bg-violet-600'
                    : 'w-2 bg-zinc-700'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              abortRef.current?.abort()
              setLoading(false)
              setPct(0)
            }}
            className="mt-8 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Nova Análise</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Envie os documentos do processo e a IA irá gerar uma ficha de análise completa.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Título */}
        <div className="space-y-2">
          <Label htmlFor="titulo" className="text-zinc-300">Identificação do Processo <span className="text-zinc-600">(opcional)</span></Label>
          <Input
            id="titulo"
            placeholder="Ex: João Silva vs Energisa — Suspensão de Fornecimento"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500"
          />
        </div>

        {/* Objeto + Estado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">
              Objeto da Ação <span className="text-violet-400">*</span>
            </Label>
            <Select value={objeto} onValueChange={setObjeto} required>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:border-violet-500">
                <SelectValue placeholder="Selecione o objeto..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 max-h-72">
                {OBJETOS_ENERGISA.map((obj) => (
                  <SelectItem key={obj} value={obj} className="text-zinc-300 focus:text-white focus:bg-zinc-800">
                    {obj}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Estado <span className="text-zinc-600">(opcional)</span></Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:border-violet-500">
                <SelectValue placeholder="Selecione o estado..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {ESTADOS_BRASIL.map((uf) => (
                  <SelectItem key={uf} value={uf} className="text-zinc-300 focus:text-white focus:bg-zinc-800">
                    {uf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Arquivos */}
        <div className="space-y-2">
          <Label className="text-zinc-300">
            Documentos do Processo <span className="text-violet-400">*</span>
          </Label>
          <p className="text-xs text-zinc-500">
            Petição inicial, documentos do cliente, laudos, prints — envie todos de uma vez.
          </p>
          <FileUploader onChange={setFiles} maxFiles={10} />
        </div>

        {/* Comentário */}
        <div className="space-y-2">
          <Label htmlFor="comentario" className="text-zinc-300">
            Perguntas ou instruções adicionais <span className="text-zinc-600">(opcional)</span>
          </Label>
          <Textarea
            id="comentario"
            placeholder="Ex: Quais são os pontos fracos dessa petição? Há risco de liminar? Sugira a melhor tese de defesa."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            maxLength={2000}
            rows={4}
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500 resize-none"
          />
          <p className="text-xs text-zinc-600 text-right">{comentario.length}/2000</p>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <Button
            type="submit"
            className="w-full sm:w-auto bg-violet-600 hover:bg-violet-500 text-white font-semibold py-5 px-8 rounded-xl gap-2 transition-all shadow-lg shadow-violet-500/20"
          >
            <Send className="w-4 h-4" />
            Analisar com IA
          </Button>
        </div>
      </form>
    </div>
  )
}
