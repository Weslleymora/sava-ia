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
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'

export default function NovaAnalisePage() {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [objeto, setObjeto] = useState('')
  const [estado, setEstado] = useState('')
  const [comentario, setComentario] = useState('')
  const [titulo, setTitulo] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
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
    setProgress('Enviando arquivos...')

    const fd = new FormData()
    fd.append('objeto', objeto)
    if (estado) fd.append('estado', estado)
    if (comentario.trim()) fd.append('comentario', comentario.trim())
    if (titulo.trim()) fd.append('titulo', titulo.trim())
    files.forEach((f) => fd.append('files', f))

    abortRef.current = new AbortController()

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

      // Lê o stream para obter o caseId
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let caseId: string | null = null

      setProgress('Analisando documentos com IA...')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.caseId && !caseId) {
              caseId = data.caseId
            }
            if (data.done && caseId) {
              router.push(`/analise/${caseId}`)
              return
            }
          } catch {
            // ignora linhas mal formadas
          }
        }
      }

      if (caseId) router.push(`/analise/${caseId}`)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      toast.error((err as Error).message ?? 'Erro ao processar análise.')
      setLoading(false)
      setProgress('')
    }
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
          <Label htmlFor="titulo" className="text-zinc-300">Identificação do Processo (opcional)</Label>
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
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {OBJETOS_ENERGISA.map((obj) => (
                  <SelectItem key={obj} value={obj} className="text-zinc-300 focus:text-white focus:bg-zinc-800">
                    {obj}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Estado (opcional)</Label>
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
            Perguntas ou instruções adicionais para a IA (opcional)
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
        <div className="flex items-center gap-4 pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="bg-violet-600 hover:bg-violet-500 text-white font-semibold py-5 px-8 rounded-xl gap-2 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {progress}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Analisar com IA
              </>
            )}
          </Button>

          {loading && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                abortRef.current?.abort()
                setLoading(false)
                setProgress('')
              }}
              className="text-zinc-500 hover:text-red-400"
            >
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
