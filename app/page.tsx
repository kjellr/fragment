'use client'
import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { ExternalLink } from 'lucide-react'
import ControlPanel from '@/components/ControlPanel'
import { DEFAULT_PARAMS, EFFECTS, type EffectId } from '@/lib/effects'

const ShaderCanvas = dynamic(() => import('@/components/ShaderCanvas'), { ssr: false })

const IMAGE_DEFAULTS: Record<string, number> = {
  count:        10000,
  spring:       15,
  damping:      3,
  noiseScale:   0,
  noiseSpeed:   0.40,
  repulRadius:  300,
  repulStrength: 8,
  particleSize: 2.5,
  colorMix:     0.70,
}

export default function Page() {
  const [effectId, setEffectId] = useState<EffectId>('image')
  const [params, setParams] = useState({ ...DEFAULT_PARAMS, ...IMAGE_DEFAULTS })
  const [colorA, setColorA] = useState('#ffffff')
  const [colorB, setColorB] = useState('#99b5ce')
  const [colorMode, setColorMode] = useState<'palette' | 'source'>('source')
  const [inputData, setInputData] = useState<any>({ type: 'none' })

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
        <a
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

      {/* Control panel — fixed right */}
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
        onInputChange={setInputData}
      />
    </div>
  )
}
