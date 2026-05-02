'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { Upload, Type, ImageIcon, Video, X, Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { EffectId } from '@/lib/effects'

interface InputState {
  type: 'none' | 'text' | 'image' | 'video'
  text?: string
  imageEl?: HTMLImageElement | HTMLCanvasElement
  videoEl?: HTMLVideoElement
  preview?: string // data URL for display
}

interface Props {
  effectId: EffectId
  onInputChange: (state: InputState) => void
}

export default function InputZone({ effectId, onInputChange }: Props) {
  const [input, setInput] = useState<InputState>({ type: 'none' })
  const [text, setText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const fileRef  = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const textDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const effectSupportsInput: Record<string, ('text' | 'image' | 'video')[]> = {
    swarm: [],
    fluid: [],
    noise: [],
    text:  ['text'],
    image: ['image'],
    video: ['video'],
  }

  const supported = effectSupportsInput[effectId] ?? []

  const commit = useCallback((state: InputState) => {
    setInput(state)
    onInputChange(state)
  }, [onInputChange])

  const clearInput = useCallback(() => {
    if (input.videoEl) {
      input.videoEl.pause()
      input.videoEl.src = ''
    }
    commit({ type: 'none' })
    setText('')
  }, [input, commit])

  // Text debounce
  const handleTextChange = (val: string) => {
    setText(val)
    if (textDebounce.current) clearTimeout(textDebounce.current)
    textDebounce.current = setTimeout(() => {
      commit({ type: 'text', text: val })
    }, 400)
  }

  // File handling
  const handleFile = useCallback((file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const src = e.target?.result as string
        const img = new Image()
        img.onload = () => commit({ type: 'image', imageEl: img, preview: src })
        img.src = src
      }
      reader.readAsDataURL(file)
    } else if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file)
      const vid = videoRef.current!
      vid.src = url
      vid.loop = true
      vid.muted = true
      vid.play().catch(() => {})
      setIsPlaying(true)
      commit({ type: 'video', videoEl: vid, preview: url })
    }
  }, [commit])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const togglePlay = () => {
    const vid = videoRef.current
    if (!vid) return
    if (vid.paused) { vid.play(); setIsPlaying(true) }
    else { vid.pause(); setIsPlaying(false) }
  }

  // When effect changes, clear incompatible input
  useEffect(() => {
    if (input.type !== 'none' && !supported.includes(input.type as any)) {
      clearInput()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectId])

  if (supported.length === 0) {
    return (
      <div className="px-4 py-3">
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          No input required for this effect.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {/* Text input */}
      {supported.includes('text') && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
            Text
          </label>
          <div className="relative">
            <textarea
              value={text}
              onChange={e => handleTextChange(e.target.value)}
              placeholder="Type something..."
              rows={3}
              className="w-full text-sm resize-none rounded px-3 py-2 outline-none transition-colors font-mono"
              style={{
                background: 'var(--input)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--mint)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            {text && (
              <button
                onClick={() => { setText(''); commit({ type: 'none' }) }}
                className="absolute top-2 right-2 opacity-40 hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Image/Video drop zone */}
      {(supported.includes('image') || supported.includes('video')) && (
        <>
          <label className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
            {supported.includes('image') ? 'Image' : 'Video'}
          </label>
          <input
            ref={fileRef}
            type="file"
            accept={[
              ...(supported.includes('image') ? ['image/*'] : []),
              ...(supported.includes('video') ? ['video/*'] : []),
            ].join(',')}
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />

          {/* Preview */}
          {input.type === 'image' && input.preview && (
            <div className="relative group">
              <img
                src={input.preview}
                alt="Input"
                className="w-full h-24 object-cover rounded"
                style={{ border: '1px solid var(--border)' }}
              />
              <button
                onClick={clearInput}
                className="absolute top-1 right-1 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.7)' }}
              >
                <X size={12} />
              </button>
            </div>
          )}
          {input.type === 'video' && (
            <div className="relative group">
              <video
                ref={videoRef}
                className="w-full h-24 object-cover rounded"
                style={{ border: '1px solid var(--border)' }}
                muted loop playsInline
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={togglePlay}
                  className="rounded-full p-1.5"
                  style={{ background: 'rgba(0,0,0,0.7)' }}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
              </div>
              <button
                onClick={clearInput}
                className="absolute top-1 right-1 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.7)' }}
              >
                <X size={12} />
              </button>
            </div>
          )}
          {(!['image', 'video'].includes(input.type)) && (
            <button
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className="flex flex-col items-center gap-2 rounded py-4 text-center transition-colors"
              style={{
                border: `1px dashed ${isDragging ? 'var(--mint)' : 'var(--text-dim, oklch(0.3 0.008 240))'}`,
                background: isDragging ? 'var(--mint-dim)' : 'transparent',
                color: 'var(--muted-foreground)',
              }}
            >
              {supported.includes('image')
                ? <ImageIcon size={16} />
                : <Video size={16} />}
              <span className="text-xs">
                {supported.includes('image') ? 'Drop image or click' : 'Drop video or click'}
              </span>
            </button>
          )}
        </>
      )}

      {/* Hidden video element for video mode */}
      {supported.includes('video') && input.type !== 'video' && (
        <video ref={videoRef} className="hidden" muted loop playsInline />
      )}
    </div>
  )
}
