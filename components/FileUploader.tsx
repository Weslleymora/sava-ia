'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, FileText, UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploaderProps {
  onChange: (files: File[]) => void
  maxFiles?: number
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function FileUploader({ onChange, maxFiles = 10 }: FileUploaderProps) {
  const [files, setFiles] = useState<File[]>([])

  const onDrop = useCallback(
    (accepted: File[]) => {
      const merged = [...files, ...accepted].slice(0, maxFiles)
      setFiles(merged)
      onChange(merged)
    },
    [files, maxFiles, onChange]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: maxFiles - files.length,
  })

  function removeFile(index: number) {
    const updated = files.filter((_, i) => i !== index)
    setFiles(updated)
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
          isDragActive
            ? 'border-violet-500 bg-violet-500/10'
            : 'border-zinc-700 bg-zinc-800/50 hover:border-violet-500/50 hover:bg-zinc-800'
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className={cn('w-10 h-10 mx-auto mb-3', isDragActive ? 'text-violet-400' : 'text-zinc-500')} />
        <p className="text-sm font-medium text-zinc-300">
          {isDragActive ? 'Solte os arquivos aqui' : 'Clique ou arraste os arquivos'}
        </p>
        <p className="text-xs text-zinc-500 mt-1">PDF, DOCX, DOC, TXT ou imagem • Até {maxFiles} arquivos</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3"
            >
              <FileText className="w-4 h-4 text-violet-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{file.name}</p>
                <p className="text-xs text-zinc-500">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-zinc-500 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
