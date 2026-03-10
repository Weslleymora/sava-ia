'use client'

import ReactMarkdown from 'react-markdown'

interface AnalysisViewerProps {
  content: string
  streaming?: boolean
}

export default function AnalysisViewer({ content, streaming = false }: AnalysisViewerProps) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-white mb-3 pb-2 border-b border-zinc-700">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold text-violet-300 mt-5 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-zinc-200 mt-4 mb-1">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-zinc-300 text-sm leading-relaxed mb-3">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside text-zinc-300 text-sm space-y-1 mb-3 pl-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-zinc-300 text-sm space-y-1 mb-3 pl-2">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
          em: ({ children }) => <em className="text-zinc-400 italic">{children}</em>,
          code: ({ children }) => (
            <code className="bg-zinc-800 text-violet-300 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 overflow-x-auto text-sm">{children}</pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-violet-500 pl-4 text-zinc-400 italic">{children}</blockquote>
          ),
          hr: () => <hr className="border-zinc-700 my-4" />,
        }}
      >
        {content}
      </ReactMarkdown>
      {streaming && (
        <span className="inline-block w-2 h-4 bg-violet-400 animate-pulse rounded-sm ml-1 align-middle" />
      )}
    </div>
  )
}
