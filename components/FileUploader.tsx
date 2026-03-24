'use client'

import { useCallback, useState } from 'react'
import { useDropzone, FileRejection } from 'react-dropzone'
import { X, FileText, UploadCloud, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAX_FILE_SIZE = 50 * 1024 * 1024   // 50 MB por arquivo
const MAX_TOTAL_SIZE = 150 * 1024 * 1024 // 150 MB total

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
  const [rejections, setRejections] = useState<string[]>([])

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      const errors: string[] = []

      // Rejeições do dropzone (tipo inválido, excesso de arquivos)
      for (const { file, errors: errs } of rejected) {
        if (errs.some(e => e.code === 'file-too-large')) {
          errors.push(`"${file.name}" excede 50 MB`)
        } else if (errs.some(e => e.code === 'too-many-files')) {
          errors.push(`"${file.name}" ignorado — limite de ${maxFiles} arquivos`)
        } else {
          errors.push(`"${file.name}" formato não suportado`)
        }
      }

      const merged = [...files, ...accepted].slice(0, maxFiles)

      // Verificar tamanho total
      const totalSize = merged.reduce((sum, f) => sum + f.size, 0)
      if (totalSize > MAX_TOTAL_SIZE) {
        errors.push(`Total de arquivos excede 150 MB. Reduza a quantidade ou o tamanho dos arquivos.`)
        setRejections(errors)
        return
      }

      setRejections(errors)
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
    maxSize: MAX_FILE_SIZE,
  })

  function removeFile(index: number) {
    const updated = files.filter((_, i) => i !== index)
    setFiles(updated)
    onChange(updated)
    setRejections([])
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)

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
        <p className="text-xs text-zinc-500 mt-1">
          PDF, DOCX, DOC, TXT ou imagem • Até {maxFiles} arquivos • Máx. 50 MB por arquivo
        </p>
      </div>

      {rejections.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 space-y-1">
          {rejections.map((msg, i) => (
            <div key={i} className="flex items-center gap-2 text-red-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {msg}
            </div>
          ))}
        </div>
      )}

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

          {files.length > 1 && (
            <p className="text-xs text-zinc-500 text-right pr-1">
              Total: {formatBytes(totalSize)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
