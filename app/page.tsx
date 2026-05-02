'use client'
import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { ExternalLink, Settings } from 'lucide-react'
import ControlPanel from '@/components/ControlPanel'
import { DEFAULT_PARAMS, EFFECTS, type EffectId } from '@/lib/effects'

const ShaderCanvas = dynamic(() => import('@/components/ShaderCanvas'), { ssr: false })

const IMAGE_DEFAULTS: Record<string, number> = {
  count:        10000,
  spring:       15,
  noiseScale:   0,
  noiseSpeed:   0.40,
  repulRadius:  300,
  repulStrength: 8,
  particleSize: 2.5,
  colorMix:     0.70,
}

const INITIAL_EFFECT: EffectId = 'video'
const INITIAL_PARAMS = {
  ...DEFAULT_PARAMS,
  ...Object.fromEntries(EFFECTS.find(e => e.id === INITIAL_EFFECT)!.params.map(p => [p.key, p.default])),
}

export default function Page() {
  const [effectId, setEffectId] = useState<EffectId>(INITIAL_EFFECT)
  const [params, setParams] = useState(INITIAL_PARAMS)
  const [colorA, setColorA] = useState('#ffffff')
  const [colorB, setColorB] = useState('#99b5ce')
  const [colorMode, setColorMode] = useState<'palette' | 'source'>('source')
  const [inputData, setInputData] = useState<any>({ type: 'none' })
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleParamChange = useCallback((key: string, val: number) => {
    setParams(p => ({ ...p, [key]: val }))
  }, [])

  const handleColorChange = useCallback((a: string, b: string) => {
    setColorA(a)
    setColorB(b)
  }, [])

  const handleEffectChange = useCallback((id: EffectId) => {
    setEffectId(id)
    const effectDefaults = Object.fromEntries(
      EFFECTS.find(e => e.id === id)!.params.map(p => [p.key, p.default])
    )
    setParams(p => ({ ...p, ...effectDefaults }))
    if (id === 'image' || id === 'video') {
      setColorMode('source')
    } else {
      setColorMode('palette')
      setColorA('#ffffff')
      setColorB('#99b5ce')
    }
  }, [])

  return (
    <div className="flex h-full w-full" style={{ background: 'var(--void, #050507)' }}>
      {/* Canvas — fills remaining space */}
      <div className="flex-1 relative overflow-hidden">
        {/* Settings toggle — mobile only */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden absolute top-4 right-4 z-10 flex items-center justify-center rounded-lg"
          style={{
            width: 36, height: 36,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            color: 'var(--muted-foreground)',
          }}
        >
          <Settings size={15} />
        </button>
        <
          href="https://kjellr.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 absolute bottom-6 left-6 text-xs font-mono px-2.5 py-1.5 rounded transition-all"
          style={{
            color: 'var(--muted-foreground)',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            zIndex: 10,
          }}
          onMouseEnter={e => {
            const el = e.currentTarget
            el.style.color = '#ffffff'
            el.style.borderColor = 'oklch(0.74 0.11 163 / 40%)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget
            el.style.color = 'var(--muted-foreground)'
            el.style.borderColor = 'var(--border)'
          }}
        >
          Built by Kjell Reigstad
          <ExternalLink size={11} />
        </a>
        <ShaderCanvas
          effectId={effectId}
          params={params}
          colorA={colorA}
          colorB={colorB}
          colorMode={colorMode}
          inputData={inputData}
        />
      </div>

      {/* Backdrop — mobile only */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-20"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Control panel — fixed right on desktop, slide-in drawer on mobile */}
      <div className={[
        'fixed lg:relative right-0 top-0 bottom-0 z-30',
        'lg:translate-x-0 transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
      ].join(' ')}>
      <ControlPanel
        effectId={effectId}
        params={params}
        colorA={colorA}
        colorB={colorB}
        colorMode={colorMode}
        onEffectChange={handleEffectChange}
        onParamChange={handleParamChange}
        onColorChange={(a, b) => { setColorMode('palette'); handleColorChange(a, b) }}
        onColorModeChange={setColorMode}
        onInputChange={data => {
          setInputData(data)
          if (data.type === 'video' && data.isNewUpload) setParams(p => ({ ...p, zoom: 1 }))
        }}
        onClose={() => setSidebarOpen(false)}
      />
      </div>
    </div>
  )
}
