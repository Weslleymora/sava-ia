'use client'

import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import ChatBox from '@/components/ChatBox'

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

interface ChatToggleProps {
  caseId: string
  initialMessages?: Message[]
}

export default function ChatToggle({ caseId, initialMessages = [] }: ChatToggleProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Botão flutuante — só visível em mobile/tablet */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/30 flex items-center justify-center transition-all active:scale-95"
        aria-label="Abrir chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Painel lateral deslizante — só visível em mobile/tablet */}
      {open && (
        <>
          {/* Overlay */}
          <div
            className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Painel */}
          <div className="lg:hidden fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-zinc-950 border-l border-zinc-800 flex flex-col shadow-2xl">
            {/* Header do painel */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-white">Conversa com a IA</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Faça perguntas sobre o caso analisado</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                aria-label="Fechar chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat sem o header (já exibido acima) */}
            <div className="flex-1 overflow-hidden">
              <ChatBox caseId={caseId} initialMessages={initialMessages} hideHeader />
            </div>
          </div>
        </>
      )}
    </>
  )
}
