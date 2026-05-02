'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { Upload, Type, ImageIcon, Video, X, Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { EffectId } from '@/lib/effects'

interface InputState {
  type: 'none' | 'text' | 'image' | 'video'
  text?: string
  fontFamily?: string
  fontWeight?: string
  imageEl?: HTMLImageElement | HTMLCanvasElement
  videoEl?: HTMLVideoElement
  preview?: string // data URL for display
}

const TYPEFACES = [
  { id: 'inter-bold',         label: 'Inter Bold',            fontFamily: 'Inter',              fontWeight: 'bold', previewFamily: 'var(--font-inter), sans-serif',                previewWeight: '700' },
  { id: 'inter-light',        label: 'Inter Light',           fontFamily: 'Inter',              fontWeight: '300',  previewFamily: 'var(--font-inter), sans-serif',                previewWeight: '300' },
  { id: 'instrument-serif',   label: 'Instrument Serif',      fontFamily: "'Instrument Serif'", fontWeight: '400',  previewFamily: 'var(--font-serif), serif',                     previewWeight: '400' },
  { id: 'unifraktur',         label: 'UnifrakturMaguntia',    fontFamily: 'UnifrakturMaguntia', fontWeight: '400',  previewFamily: 'var(--font-unifraktur), cursive',              previewWeight: '400' },
  { id: 'playwrite-de-sas',   label: 'Playwrite DE SAS',      fontFamily: "'Playwrite DE SAS'", fontWeight: '400',  previewFamily: 'var(--font-playwrite-de-sas), cursive',        previewWeight: '400' },
] as const

interface Props {
  effectId: EffectId
  onInputChange: (state: InputState) => void
}

const DEFAULT_TEXTS = ['Fragment', 'Oh fuck', 'Sorry', 'The End']

export default function InputZone({ effectId, onInputChange }: Props) {
  const [input, setInput] = useState<InputState>({ type: 'none' })
  const [text, setText] = useState('')
  const [typefaceId, setTypefaceId] = useState<typeof TYPEFACES[number]['id']>('playwrite-de-sas')
  const textVisitCount = useRef(0)
  const isUserText = useRef(false)
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

  const currentTypeface = () => TYPEFACES.find(t => t.id === typefaceId)!

  // Text debounce
  const handleTextChange = (val: string) => {
    isUserText.current = val.trim().length > 0
    setText(val)
    if (textDebounce.current) clearTimeout(textDebounce.current)
    textDebounce.current = setTimeout(() => {
      const { fontFamily, fontWeight } = currentTypeface()
      commit({ type: 'text', text: val, fontFamily, fontWeight })
    }, 400)
  }

  const handleTypefaceChange = (id: typeof TYPEFACES[number]['id']) => {
    setTypefaceId(id)
    if (text.trim()) {
      const tf = TYPEFACES.find(t => t.id === id)!
      commit({ type: 'text', text, fontFamily: tf.fontFamily, fontWeight: tf.fontWeight })
    }
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

  // On switching to text: re-apply user text, or load next default in sequence
  useEffect(() => {
    if (effectId !== 'text') return
    if (isUserText.current && text.trim()) {
      const tf = TYPEFACES.find(t => t.id === typefaceId)!
      document.fonts.load(`${tf.fontWeight} 120px Playwrite DE SAS`).finally(() => {
        commit({ type: 'text', text, fontFamily: tf.fontFamily, fontWeight: tf.fontWeight })
      })
      return
    }
    const defaultText = DEFAULT_TEXTS[textVisitCount.current % DEFAULT_TEXTS.length]
    textVisitCount.current += 1
    const tf = TYPEFACES.find(t => t.id === 'playwrite-de-sas')!
    document.fonts.load(`${tf.fontWeight} 120px Playwrite DE SAS`).finally(() => {
      setText(defaultText)
      setTypefaceId('playwrite-de-sas')
      commit({ type: 'text', text: defaultText, fontFamily: tf.fontFamily, fontWeight: tf.fontWeight })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectId])

  // On switching to image: re-apply existing image, or load default
  useEffect(() => {
    if (effectId !== 'image') return
    if (input.type === 'image' && input.imageEl) {
      commit({ ...input })
      return
    }
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
    const src = `${base}/kj_icon.png`
    const img = new Image()
    img.onload = () => commit({ type: 'image', imageEl: img, preview: src })
    img.src = src
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectId])

  // On switching to video: re-apply existing video, or load default
  useEffect(() => {
    if (effectId !== 'video') return
    if (input.type === 'video' && input.videoEl) {
      commit({ ...input })
      return
    }
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
    const url = `${base}/logo-animation.mp4`
    const vid = videoRef.current!
    vid.src = url
    vid.loop = true
    vid.muted = true
    vid.play().catch(() => {})
    setIsPlaying(true)
    commit({ type: 'video', videoEl: vid, preview: url })
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
                onClick={() => { setText(''); isUserText.current = false; commit({ type: 'none' }) }}
                className="absolute top-2 right-2 opacity-40 hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Typeface selector */}
      {supported.includes('text') && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
            Typeface
          </label>
          <select
            value={typefaceId}
            onChange={e => handleTypefaceChange(e.target.value as typeof TYPEFACES[number]['id'])}
            className="w-full text-sm rounded px-3 py-2.5 outline-none transition-colors"
            style={{
              background: 'var(--input)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              fontFamily: TYPEFACES.find(t => t.id === typefaceId)?.previewFamily,
              fontWeight: TYPEFACES.find(t => t.id === typefaceId)?.previewWeight,
            }}
          >
            {TYPEFACES.map(tf => (
              <option key={tf.id} value={tf.id}>{tf.label}</option>
            ))}
          </select>
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
          {/* Single video element — always mounted so src/playback survive re-renders */}
          <div className={`relative group ${input.type === 'video' ? '' : 'hidden'}`}>
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
                cursor: 'pointer',
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

    </div>
  )
}
